import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PlatformMap } from '@/components/shared/PlatformMap';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Checkpoint, Pedido, UbicacionDomiciliario } from '@/types';

type EstadoRastreo = {
  latitud: number;
  longitud: number;
  precision: number;
  actualizadoEn: number;
};

const CHECKPOINTS_TITULOS: Record<string, string> = {
  pedido_recibido: '1. Pedido recibido por domiciliario',
  pedido_recogido: '2. Pedido recogido en farmacia',
  en_camino: '3. En camino a tu dirección',
  cerca_destino: '4. Cerca del destino',
  pedido_entregado: '5. Pedido entregado',
};

export default function RastreoScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();
  const [loadingUbicacion, setLoadingUbicacion] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [ubicacionError, setUbicacionError] = useState('');
  const [ubicacion, setUbicacion] = useState<EstadoRastreo | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(true);
  const [ubicacionDomiciliario, setUbicacionDomiciliario] = useState<UbicacionDomiciliario | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  // Escuchar pedido activo en tiempo real
  useEffect(() => {
    if (!perfil?.uid) {
      setPedidoActivo(null);
      setLoadingPedido(false);
      return;
    }

    setLoadingPedido(true);
    const q = query(
      collection(db, 'pedidos'),
      where('usuarioId', '==', perfil.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const pedidosUsuario = snapshot.docs.map(
          (docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) } as Pedido)
        );

        const estadosActivos = ['pendiente', 'asignado', 'en_preparacion', 'listo', 'en_camino'];
        const activos = pedidosUsuario
          .filter((p) => estadosActivos.includes(p.estado))
          .sort((a, b) => {
            const timeA = a.timestampCreacion && 'toMillis' in a.timestampCreacion ? a.timestampCreacion.toMillis() : 0;
            const timeB = b.timestampCreacion && 'toMillis' in b.timestampCreacion ? b.timestampCreacion.toMillis() : 0;
            return timeB - timeA;
          });

        setPedidoActivo(activos[0] || null);
        setLoadingPedido(false);
      },
      (error) => {
        console.error('Error al escuchar pedido activo:', error);
        setLoadingPedido(false);
      }
    );

    return () => unsub();
  }, [perfil?.uid]);

  // Escuchar ubicación del domiciliario y checkpoints si hay pedido en camino
  useEffect(() => {
    if (!pedidoActivo) {
      setUbicacionDomiciliario(null);
      setCheckpoints([]);
      return;
    }

    let unsubDom: (() => void) | undefined;
    let unsubCheckpoints: (() => void) | undefined;

    if (pedidoActivo.domiciliarioId) {
      unsubDom = firestoreService.escucharUbicacionDomiciliario(
        pedidoActivo.domiciliarioId,
        setUbicacionDomiciliario
      );
    }

    if (pedidoActivo.id) {
      unsubCheckpoints = firestoreService.escucharCheckpoints(
        pedidoActivo.id,
        setCheckpoints
      );
    }

    return () => {
      if (unsubDom) unsubDom();
      if (unsubCheckpoints) unsubCheckpoints();
    };
  }, [pedidoActivo]);

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
  }, [cargarUbicacion]);

  const mapCenterLat = ubicacionDomiciliario?.latitud ?? ubicacion?.latitud ?? 4.711;
  const mapCenterLng = ubicacionDomiciliario?.longitud ?? ubicacion?.longitud ?? -74.072;

  const markers = [];
  if (ubicacionDomiciliario) {
    markers.push({
      latitude: ubicacionDomiciliario.latitud,
      longitude: ubicacionDomiciliario.longitud,
      title: 'Domiciliario',
      description: 'Ubicación en vivo del domiciliario',
      color: theme.colors.primary,
    });
  }
  if (ubicacion) {
    markers.push({
      latitude: ubicacion.latitud,
      longitude: ubicacion.longitud,
      title: 'Tu ubicación',
      description: 'Destino del pedido',
      color: theme.colors.info,
    });
  }

  const estadoBadgeTexto: Record<string, string> = {
    pendiente: 'Pendiente de revisión',
    asignado: 'Domiciliario asignado',
    en_preparacion: 'En preparación en farmacia',
    listo: 'Listo para despacho',
    en_camino: 'En camino a tu dirección',
    entregado: 'Entregado',
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Rastreo en vivo"
          title="Seguimiento de Entrega"
          subtitle="Monitorea la ubicación de tu domiciliario y el progreso de tu entrega."
        />

        {/* Mapa y Geolocalización */}
        <Card>
          <View style={styles.cardBlock}>
            <Text style={[styles.tituloSeccion, { color: theme.colors.text }]}>Mapa de Seguimiento en Vivo</Text>

            {permissionDenied ? (
              <View style={styles.block}>
                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  Para mostrar tu posición exacta en el mapa se requiere permiso de ubicación.
                </Text>
                <Button texto="Abrir configuración" onPress={() => Linking.openSettings()} />
              </View>
            ) : (
              <View style={styles.block}>
                <PlatformMap
                  latitude={mapCenterLat}
                  longitude={mapCenterLng}
                  title={ubicacionDomiciliario ? 'Domiciliario en camino' : 'Tu ubicación'}
                  description="Mapa interactivo con OpenStreetMap"
                  height={220}
                  markers={markers}
                />
                {ubicacionDomiciliario ? (
                  <Text style={[styles.infoLive, { color: theme.colors.primary }]}>
                    ● Domiciliario transmitiendo ubicación en tiempo real
                  </Text>
                ) : (
                  <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                    {loadingUbicacion ? 'Obteniendo señal GPS...' : 'Esperando transmisión de coordenadas del domiciliario asignado.'}
                  </Text>
                )}
              </View>
            )}
          </View>
        </Card>

        {/* Estado del pedido activo */}
        <Card>
          <View style={styles.cardBlock}>
            <Text style={[styles.tituloSeccion, { color: theme.colors.text }]}>Estado del Pedido</Text>
            {loadingPedido ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
              </View>
            ) : null}

            {!loadingPedido && pedidoActivo ? (
              <View style={styles.block}>
                <View
                  style={[
                    styles.chipEstado,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.chipTexto, { color: theme.colors.primary }]}>
                    {estadoBadgeTexto[pedidoActivo.estado] || pedidoActivo.estado}
                  </Text>
                </View>

                <Text style={[styles.info, { color: theme.colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>Medicamentos: </Text>
                  {pedidoActivo.medicamentos?.map((m) => `${m.nombre} (x${m.cantidad})`).join(', ')}
                </Text>

                <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: 'bold' }}>Dirección de entrega: </Text>
                  {pedidoActivo.direccionEntrega?.direccion ?? 'Recogida en farmacia'}
                </Text>

                {/* Línea de tiempo de Checkpoints */}
                {checkpoints.length > 0 && (
                  <View style={styles.timelineWrap}>
                    <Text style={[styles.subtitulo, { color: theme.colors.text }]}>Progreso de la entrega</Text>
                    {checkpoints.map((cp, idx) => (
                      <View key={cp.id || idx} style={styles.checkpointItem}>
                        <Text style={[styles.cpIcon, { color: cp.estado === 'completado' ? theme.colors.successText : theme.colors.textSecondary }]}>
                          {cp.estado === 'completado' ? '✓' : '○'}
                        </Text>
                        <View style={styles.cpContent}>
                          <Text style={[styles.cpTitulo, { color: theme.colors.text }]}>
                            {CHECKPOINTS_TITULOS[cp.tipo] || cp.nombre}
                          </Text>
                          {cp.observacion ? (
                            <Text style={[styles.cpObs, { color: theme.colors.textSecondary }]}>
                              Nota: {cp.observacion}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {!loadingPedido && !pedidoActivo ? (
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                No tienes pedidos activos en curso actualmente.
              </Text>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  cardBlock: { gap: 8 },
  tituloSeccion: { fontWeight: '700', fontSize: 16 },
  loaderWrap: { justifyContent: 'center', alignItems: 'center', paddingVertical: 18 },
  block: { gap: 8 },
  chipEstado: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipTexto: { fontWeight: '700', fontSize: 12 },
  info: { lineHeight: 20, fontSize: 14 },
  infoLive: { fontWeight: '700', fontSize: 13, marginTop: 4 },
  subtitulo: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  timelineWrap: { gap: 8, marginTop: 6 },
  checkpointItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cpIcon: { fontSize: 16, fontWeight: 'bold', width: 20 },
  cpContent: { flex: 1, gap: 2 },
  cpTitulo: { fontSize: 13, fontWeight: '600' },
  cpObs: { fontSize: 12, fontStyle: 'italic' },
});
