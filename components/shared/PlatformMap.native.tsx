import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

/**
 * Componente de mapa nativo (Android / iOS) usando react-native-maps.
 * Utiliza mapType="standard" para garantizar renderizado nativo confiable sin pantallas grises,
 * y permite abrir la ubicación directamente en OpenStreetMap o Google Maps con un toque.
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

  const handleOpenExternalMap = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    void Linking.openURL(url);
  };

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
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        mapType="standard"
        showsUserLocation={false}
        showsCompass={true}
        loadingEnabled={true}
        loadingIndicatorColor={theme.colors.primary}
        loadingBackgroundColor={theme.colors.surfaceSecondary}
      >
        {/* Capa de mosaicos CartoDB Voyager de alta disponibilidad */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={1}
        />

        {/* Marcador principal (Ubicación actual / Destino) */}
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description={description}
          pinColor={theme.colors.primary}
        >
          <Callout>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>{title}</Text>
              {description ? <Text style={styles.calloutDesc}>{description}</Text> : null}
            </View>
          </Callout>
        </Marker>

        {/* Marcadores adicionales (ej: Domiciliario en ruta o Farmacia) */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            pinColor={m.color || theme.colors.info}
          >
            <Callout>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutTitle}>{m.title}</Text>
                {m.description ? <Text style={styles.calloutDesc}>{m.description}</Text> : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

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
        <Ionicons name="map-outline" size={14} color={theme.colors.primary} />
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
    ...StyleSheet.absoluteFill,
  },
  calloutBox: {
    padding: 6,
    maxWidth: 200,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  calloutDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
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
