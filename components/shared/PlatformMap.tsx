import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformMapProps } from './PlatformMap.types';

/**
 * Componente de mapa para versión Web / Fallback con OpenStreetMap libre.
 * No depende de servicios ni APIs de Google.
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

  const handleOpenOpenStreetMap = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    void Linking.openURL(url);
  };

  return (
    <View
      style={[
        styles.webContainer,
        {
          height,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>OpenStreetMap</Text>
        </View>
      </View>

      {description ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}

      <View
        style={[
          styles.coordBox,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.coordText, { color: theme.colors.textSecondary }]}>
          Lat: <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{latitude.toFixed(6)}</Text>
        </Text>
        <Text style={[styles.coordText, { color: theme.colors.textSecondary }]}>
          Lng: <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{longitude.toFixed(6)}</Text>
        </Text>
      </View>

      {markers.length > 0 && (
        <View style={styles.markersSummary}>
          <Text style={[styles.markersText, { color: theme.colors.textSecondary }]}>
            {markers.length} punto(s) adicional(es) en ruta
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.externalButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenOpenStreetMap}
        activeOpacity={0.8}
      >
        <Ionicons name="map-outline" size={16} color="#ffffff" />
        <Text style={styles.externalButtonText}>Ver en OpenStreetMap</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  coordBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  coordText: {
    fontSize: 13,
  },
  markersSummary: {
    alignItems: 'center',
  },
  markersText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  externalButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
