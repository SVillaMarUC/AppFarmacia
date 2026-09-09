import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { PlatformMap } from '@/components/shared/PlatformMap';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

type EstadoRastreo = {
  latitud: number;
  longitud: number;
  precision: number;
  actualizadoEn: number;
};

export default function RastreoScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();
  const [loadingUbicacion, setLoadingUbicacion] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [ubicacionError, setUbicacionError] = useState('');
  const [ubicacion, setUbicacion] = useState<EstadoRastreo | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [pedidoError, setPedidoError] = useState('');
  const [loadingPedido, setLoadingPedido] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const cargarPedidoActivo = useCallback(async () => {
    if (!perfil?.uid) {
      setPedidoActivo(null);
      setLoadingPedido(false);
      return;
    }

    try {
      setLoadingPedido(true);
      setPedidoError('');
      const pedidosRef = collection(db, 'pedidos');
      const consulta = query(
        pedidosRef,
        where('usuarioId', '==', perfil.uid),
        where('estado', 'in', ['pendiente', 'en_camino']),
        orderBy('creadoEn', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(consulta);
      const documento = snapshot.docs[0];
      if (!documento) {
        setPedidoActivo(null);
        return;
      }

      setPedidoActivo({ id: documento.id, ...(documento.data() as Omit<Pedido, 'id'>) });
    } catch {
      setPedidoError('No fue posible cargar el estado del pedido. Intenta nuevamente.');
      setPedidoActivo(null);
    } finally {
      setLoadingPedido(false);
    }
  }, [perfil?.uid]);

  const cargarUbicacion = useCallback(async () => {
    try {
      setLoadingUbicacion(true);
      setUbicacionError('');
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setPermissionDenied(true);
        setUbicacion(null);
        return;
      }

      setPermissionDenied(false);
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUbicacion({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precision: posicion.coords.accuracy ?? 0,
        actualizadoEn: posicion.timestamp,
      });
    } catch {
      setUbicacionError('No se pudo obtener la geolocalización actual.');
    } finally {
      setLoadingUbicacion(false);
    }
  }, []);

  useEffect(() => {
    void cargarUbicacion();
    void cargarPedidoActivo();
  }, [cargarPedidoActivo, cargarUbicacion, reloadKey]);

  const renderChipEstado = (estado?: string) => {
    if (!estado) {
      return null;
    }
    const texto = estado === 'en_camino' ? 'En camino' : 'Pendiente';
    return (
      <Text
        style={[
          styles.chipEstado,
          {
            backgroundColor: theme.colors.primaryLight,
            color: theme.colors.primary,
          },
        ]}
      >
        {texto}
      </Text>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <View style={styles.cardBlock}>
            <Text style={[styles.tituloSeccion, { color: theme.colors.text }]}>Tu ubicación y ruta</Text>
            {loadingUbicacion ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
              </View>
            ) : null}

            {!loadingUbicacion && permissionDenied ? (
              <View style={styles.block}>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Para rastrear tu pedido en tiempo real se requiere acceso a tu ubicación.
                </Text>
                <Button texto="Abrir configuración" onPress={() => Linking.openSettings()} />
              </View>
            ) : null}

            {!loadingUbicacion && !permissionDenied && ubicacionError ? (
              <View style={styles.block}>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>{ubicacionError}</Text>
                <Button texto="Reintentar ubicación" onPress={() => void cargarUbicacion()} />
              </View>
            ) : null}

            {!loadingUbicacion && !permissionDenied && ubicacion ? (
              <View style={styles.block}>
                <PlatformMap
                  latitude={ubicacion.latitud}
                  longitude={ubicacion.longitud}
                  title="Tu ubicación actual"
                  description="Posición del dispositivo"
                  height={180}
                />
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Latitud: {ubicacion.latitud.toFixed(6)} | Longitud: {ubicacion.longitud.toFixed(6)}
                </Text>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Precisión: {Math.round(ubicacion.precision)} m | Actualizado:{' '}
                  {new Date(ubicacion.actualizadoEn).toLocaleTimeString('es-CO', { hour12: false })}
                </Text>
                <Button texto="Actualizar ubicación" onPress={() => void cargarUbicacion()} />
              </View>
            ) : null}
          </View>
        </Card>

        <Card>
          <View style={styles.cardBlock}>
            <Text style={[styles.tituloSeccion, { color: theme.colors.text }]}>Estado del pedido</Text>
            {loadingPedido ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
              </View>
            ) : null}

            {pedidoError ? (
              <View style={styles.block}>
                <Text style={[styles.error, { color: theme.colors.error }]}>{pedidoError}</Text>
                <Button texto="Reintentar pedido" onPress={() => setReloadKey((prev) => prev + 1)} />
              </View>
            ) : null}

            {!loadingPedido && !pedidoError && pedidoActivo ? (
              <View style={styles.block}>
                {renderChipEstado(pedidoActivo.estado)}
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Medicamentos:{' '}
                  {pedidoActivo.medicamentos?.length
                    ? pedidoActivo.medicamentos.map((med) => `${med.nombre} (${med.cantidad})`).join(', ')
                    : 'Sin medicamentos registrados'}
                </Text>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Modo de entrega: {pedidoActivo.modoEntrega === 'domicilio' ? 'A domicilio' : 'Recoger en punto'}
                </Text>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Dirección de entrega: {pedidoActivo.direccionEntrega?.direccion ?? 'No aplica'}
                </Text>
              </View>
            ) : null}

            {!loadingPedido && !pedidoError && !pedidoActivo ? (
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                No tienes pedidos activos en este momento.
              </Text>
            ) : null}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  cardBlock: {
    gap: 6,
  },
  tituloSeccion: {
    fontWeight: '700',
    fontSize: 16,
  },
  loaderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  block: {
    gap: 6,
  },
  chipEstado: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    marginBottom: 6,
  },
  info: {
    lineHeight: 20,
    fontSize: 14,
  },
  error: {
    fontWeight: '600',
    fontSize: 14,
  },
});
