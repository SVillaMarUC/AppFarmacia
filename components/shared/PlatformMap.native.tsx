import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

const RNWebView = WebView as any;

/**
 * Mapa nativo (Android / iOS): Leaflet + OpenStreetMap dentro de una WebView.
 * El HTML se carga una sola vez; los marcadores se actualizan vía injectJavaScript,
 * así el mapa no se recarga ni pierde zoom/paneo cuando el repartidor se mueve.
 */
const buildHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .custom-pin { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
      border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 18px; border: 2px solid #2563eb; }
    .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 12px; padding: 2px; }
    .popup-title { font-weight: 700; color: #0f172a; margin-bottom: 2px; font-size: 13px; }
    .popup-desc { color: #475569; font-size: 11px; }
    .osm-credit { position: absolute; left: 6px; bottom: 4px; z-index: 1000; font-size: 10px; color: #334155;
      background: rgba(255,255,255,0.75); padding: 1px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="osm-credit">© OpenStreetMap</div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var pins = {};
    var fitted = false;
    var userMoved = false;
    map.on('dragstart zoomstart', function () { userMoved = true; });

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    window.setMarkers = function (list) {
      var seen = {};
      list.forEach(function (m) {
        seen[m.id] = true;
        var html = '<div class="popup-title">' + esc(m.title) + '</div>' +
          (m.desc ? '<div class="popup-desc">' + esc(m.desc) + '</div>' : '');
        if (pins[m.id]) {
          pins[m.id].setLatLng([m.lat, m.lng]);
          pins[m.id].setPopupContent(html);
        } else {
          var icon = L.divIcon({
            className: '', iconSize: [34, 34], iconAnchor: [17, 17],
            html: '<div class="custom-pin" style="border-color:' + esc(m.color) + '">' + m.icon + '</div>'
          });
          pins[m.id] = L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(html);
        }
      });
      Object.keys(pins).forEach(function (id) {
        if (!seen[id]) { map.removeLayer(pins[id]); delete pins[id]; }
      });
      var pts = list.map(function (m) { return [m.lat, m.lng]; });
      if (pts.length > 1 && (!fitted || !userMoved)) {
        map.fitBounds(pts, { padding: [30, 30], maxZoom: 17, animate: true });
        fitted = true;
      }
    };
  </script>
</body>
</html>
`;

export const PlatformMap = ({
  latitude,
  longitude,
  title = 'Ubicación',
  description,
  height = 220,
  markers = [],
}: PlatformMapProps) => {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const handleOpenExternalMap = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    void Linking.openURL(url);
  };

  // Lista completa de marcadores (el destino siempre va primero)
  const markersData = useMemo(() => {
    const safeLat = Number.isFinite(latitude) ? latitude : 4.711;
    const safeLng = Number.isFinite(longitude) ? longitude : -74.072;
    return [
      { id: 'destino', lat: safeLat, lng: safeLng, title: title || 'Ubicación', desc: description || '', color: '#2563eb', icon: '📍' },
      ...markers.map((m) => ({
        id: m.id,
        lat: m.latitude,
        lng: m.longitude,
        title: m.title || 'Punto',
        desc: m.description || '',
        color: m.color || '#0f766e',
        icon: m.kind === 'domiciliario' ? '🛵' : '📍',
      })),
    ];
  }, [latitude, longitude, title, description, markers]);

  // HTML generado una sola vez (centro inicial)
  const htmlContent = useMemo(
    () => buildHtml(markersData[0].lat, markersData[0].lng),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Cada cambio de marcadores se envía a la WebView sin recargarla
  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify(markersData).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(
      `window.setMarkers && window.setMarkers(${payload}); true;`
    );
  }, [markersData, ready]);

  return (
    <View
      style={[
        styles.container,
        { height, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <RNWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://farma-ya.app' }}
        onLoadEnd={() => setReady(true)}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
      />

      <TouchableOpacity
        style={[styles.floatingBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={handleOpenExternalMap}
        activeOpacity={0.85}
      >
        <Ionicons name="map-outline" size={13} color={theme.colors.primary} />
        <Text style={[styles.floatingBtnText, { color: theme.colors.primary }]}>OpenStreetMap</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 8,
    position: 'relative',
  },
  map: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 10,
  },
  floatingBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});