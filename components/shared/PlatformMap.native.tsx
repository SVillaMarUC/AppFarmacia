import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

/**
 * Componente de mapa nativo (Android / iOS) usando react-native-maps.
 */
export const PlatformMap = ({
  latitude,
  longitude,
  title = 'Ubicación',
  description,
  height = 200,
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
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description={description}
        />
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
