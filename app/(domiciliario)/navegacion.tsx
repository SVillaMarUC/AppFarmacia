import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { PlatformMap } from '@/components/shared/PlatformMap';
import { useTheme } from '@/context/ThemeContext';

type EstadoUbicacion = {
  latitud: number;
  longitud: number;
  precision: number;
  actualizadoEn: number;
};

export default function NavegacionScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion | null>(null);

  const cargarUbicacion = useCallback(async () => {
    try {
      setLoading(true);
      setErrorUbicacion('');
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setPermisoDenegado(true);
        setUbicacion(null);
        return;
      }

      setPermisoDenegado(false);
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUbicacion({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precision: posicion.coords.accuracy ?? 0,
        actualizadoEn: posicion.timestamp,
      });
    } catch {
      setErrorUbicacion('No se pudo obtener la ubicación actual.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarUbicacion();
  }, [cargarUbicacion]);

  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Navegación</Text>

            {loading ? (
              <ActivityIndicator color={theme.colors.primary} size="large" />
            ) : null}

            {!loading && permisoDenegado ? (
              <>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  Para rastrear tu ruta necesitamos acceso a tu ubicación.
                </Text>
                <Button texto="Abrir configuración" onPress={() => Linking.openSettings()} />
              </>
            ) : null}

            {!loading && !permisoDenegado && errorUbicacion ? (
              <>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  {errorUbicacion}
                </Text>
                <Button texto="Reintentar" onPress={() => void cargarUbicacion()} />
              </>
            ) : null}

            {!loading && !permisoDenegado && ubicacion ? (
              <View style={styles.block}>
                <PlatformMap
                  latitude={ubicacion.latitud}
                  longitude={ubicacion.longitud}
                  title="Posición de Navegación"
                  description="Ubicación en ruta"
                  height={220}
                />
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  Latitud: {ubicacion.latitud.toFixed(6)}
                </Text>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  Longitud: {ubicacion.longitud.toFixed(6)}
                </Text>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  Precisión: {Math.round(ubicacion.precision)} m
                </Text>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                  Última actualización: {new Date(ubicacion.actualizadoEn).toLocaleTimeString('es-CO', { hour12: false })}
                </Text>
                <Button texto="Actualizar ubicación" onPress={() => void cargarUbicacion()} />
              </View>
            ) : null}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 10 },
  title: { fontWeight: '800', fontSize: 24 },
  text: { fontSize: 14, lineHeight: 20 },
  block: { gap: 6 },
});
