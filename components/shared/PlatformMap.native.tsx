import { StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

/**
 * Componente de mapa nativo (Android / iOS) usando react-native-maps con OpenStreetMap tiles gratuitos.
 * No depende de Google Maps API ni genera costos de desarrollo o producción.
 */
export const PlatformMap = ({
  latitude,
  longitude,
  title = 'Ubicación',
  description,
  height = 200,
  markers = [],
}: PlatformMapProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        mapType="none"
      >
        {/* Capa de mosaicos 100% libre de OpenStreetMap */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={1}
        />

        {/* Marcador principal */}
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description={description}
          pinColor={theme.colors.primary}
        />

        {/* Marcadores adicionales si existen */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            pinColor={m.color || theme.colors.info}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 8,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
