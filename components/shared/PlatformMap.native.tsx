import { useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

/**
 * Componente de mapa nativo (Android / iOS) basado en Leaflet + OpenStreetMap (CartoDB Voyager)
 * usando react-native-webview.
 * 
 * ✅ 100% Libre y gratuito: No requiere API key de Google Maps.
 * ✅ Cero pantallas grises: Carga directamente en Expo Go y builds nativos.
 * ✅ Interactivo: Soporta zoom táctil, paneo, marcadores personalizados y apertura en apps GPS externas.
 */
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

  const handleOpenExternalMap = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    void Linking.openURL(url);
  };

  const htmlContent = useMemo(() => {
    const safeLat = Number.isFinite(latitude) ? latitude : 4.711;
    const safeLng = Number.isFinite(longitude) ? longitude : -74.072;

    const markersData = [
      {
        lat: safeLat,
        lng: safeLng,
        title: title || 'Ubicación',
        desc: description || '',
        color: '#2563eb',
        icon: '📍',
      },
      ...markers.map((m) => ({
        lat: m.latitude,
        lng: m.longitude,
        title: m.title || 'Punto',
        desc: m.description || '',
        color: m.color || '#0f766e',
        icon: m.title?.toLowerCase().includes('domiciliario') ? '🛵' : '📍',
      })),
    ];

    return `
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
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 18px;
      border: 2px solid #2563eb;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 12px;
      padding: 2px;
    }
    .popup-title { font-weight: 700; color: #0f172a; margin-bottom: 2px; font-size: 13px; }
    .popup-desc { color: #475569; font-size: 11px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${safeLat}, ${safeLng}], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    var markers = ${JSON.stringify(markersData)};
    var bounds = [];

    markers.forEach(function(m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="custom-pin" style="border-color:' + m.color + '">' + m.icon + '</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
      marker.bindPopup('<div class="popup-title">' + m.title + '</div>' + (m.desc ? '<div class="popup-desc">' + m.desc + '</div>' : ''));
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  </script>
</body>
</html>
    `;
  }, [latitude, longitude, title, description, markers]);

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSecondary,
        },
      ]}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
      />

      {/* Botón flotante para abrir en OpenStreetMap / Maps */}
      <TouchableOpacity
        style={[
          styles.floatingBtn,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={handleOpenExternalMap}
        activeOpacity={0.85}
      >
        <Ionicons name="map-outline" size={13} color={theme.colors.primary} />
        <Text style={[styles.floatingBtnText, { color: theme.colors.primary }]}>
          OpenStreetMap
        </Text>
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
