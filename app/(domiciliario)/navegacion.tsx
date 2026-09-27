import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PlatformMap } from '@/components/shared/PlatformMap';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Checkpoint, EstadoCheckpoint, Pedido, TipoCheckpoint } from '@/types';

type EstadoUbicacion = {
  latitud: number;
  longitud: number;
  precision: number;
  actualizadoEn: number;
};

type CheckpointConfig = {
  tipo: TipoCheckpoint;
  titulo: string;
  descripcion: string;
};

const CHECKPOINTS_CONFIG: CheckpointConfig[] = [
  {
    tipo: 'pedido_recibido',
    titulo: '1. Pedido Recibido',
    descripcion: 'Has recibido la asignación del pedido.',
  },
  {
    tipo: 'pedido_recogido',
    titulo: '2. Pedido Recogido en Farmacia',
    descripcion: 'El pedido fue retirado del inventario de farmacia.',
  },
  {
    tipo: 'en_camino',
    titulo: '3. En Camino al Destino',
    descripcion: 'Te encuentras en desplazamiento hacia el paciente.',
  },
  {
    tipo: 'cerca_destino',
    titulo: '4. Cerca del Destino',
    descripcion: 'Has arribado a la proximidad de la dirección de entrega.',
  },
  {
    tipo: 'pedido_entregado',
    titulo: '5. Pedido Entregado',
    descripcion: 'El pedido fue entregado satisfactoriamente al paciente.',
  },
];

export default function NavegacionScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [observacion, setObservacion] = useState('');
  const [procesandoCheckpoint, setProcesandoCheckpoint] = useState(false);

  // Escuchar pedidos asignados al domiciliario
  useEffect(() => {
    if (!perfil?.uid) return;

    const unsub = firestoreService.escucharPedidosDomiciliario(perfil.uid, (pedidos) => {
      const activo = pedidos.find((p) => p.estado === 'en_camino' || p.estado === 'asignado') || null;
      setPedidoActivo(activo);
      setLoading(false);
    });

    return () => unsub();
  }, [perfil?.uid]);

  // Escuchar checkpoints del pedido activo
  useEffect(() => {
    if (!pedidoActivo?.id) {
      setCheckpoints([]);
      return;
    }

    const unsub = firestoreService.escucharCheckpoints(pedidoActivo.id, (list) => {
      setCheckpoints(list);
    });

    return () => unsub();
  }, [pedidoActivo?.id]);

  // Actualizar geolocalización continua
  useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;
    let cancelado = false;

    const iniciarTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelado) {
            setPermisoDenegado(true);
            setErrorUbicacion('Permiso de ubicación denegado.');
          }
          return;
        }

        if (cancelado) return;
        setPermisoDenegado(false);

        // Obtener posición inicial
        const posInicial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelado) {
          const nuevaUbicacion = {
            latitud: posInicial.coords.latitude,
            longitud: posInicial.coords.longitude,
            precision: posInicial.coords.accuracy ?? 0,
            actualizadoEn: posInicial.timestamp,
          };
          setUbicacion(nuevaUbicacion);

          if (perfil?.uid) {
            void firestoreService.actualizarUbicacionDomiciliario(
              perfil.uid,
              nuevaUbicacion.latitud,
              nuevaUbicacion.longitud,
              pedidoActivo?.id
            );
          }
        }

        // Suscribirse a cambios continuos de posición
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 15,
          },
          (loc) => {
            if (cancelado) return;
            const updated = {
              latitud: loc.coords.latitude,
              longitud: loc.coords.longitude,
              precision: loc.coords.accuracy ?? 0,
              actualizadoEn: loc.timestamp,
            };
            setUbicacion(updated);

            if (perfil?.uid) {
              void firestoreService.actualizarUbicacionDomiciliario(
                perfil.uid,
                updated.latitud,
                updated.longitud,
                pedidoActivo?.id
              );
            }
          }
        );
      } catch (err) {
        console.error('Error al iniciar GPS:', err);
        if (!cancelado) setErrorUbicacion('No fue posible obtener coordenadas GPS.');
      }
    };

    void iniciarTracking();

    return () => {
      cancelado = true;
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, [perfil?.uid, pedidoActivo?.id]);

  // Próximo checkpoint sugerido
  const checkpointSiguiente = useMemo(() => {
    const tiposCompletados = new Set(
      checkpoints.filter((c) => c.estado === 'completado').map((c) => c.tipo)
    );
    return CHECKPOINTS_CONFIG.find((c) => !tiposCompletados.has(c.tipo)) || null;
  }, [checkpoints]);

  const registrarCheckpoint = async (config: CheckpointConfig) => {
    if (!pedidoActivo?.id || !perfil?.uid) {
      Alert.alert('Sin pedido activo', 'No tienes un pedido activo asignado para actualizar.');
      return;
    }

    try {
      setProcesandoCheckpoint(true);

      await firestoreService.registrarCheckpoint(pedidoActivo.id, perfil.uid, {
        tipo: config.tipo,
        nombre: config.titulo,
        estado: 'completado' as EstadoCheckpoint,
        latitud: ubicacion?.latitud ?? null,
        longitud: ubicacion?.longitud ?? null,
        precisionGPS: ubicacion?.precision ?? null,
        observacion: observacion.trim(),
      });

      // Sincronizar estado del pedido según el checkpoint
      if (config.tipo === 'en_camino' || config.tipo === 'pedido_recogido') {
        await updateDoc(doc(db, 'pedidos', pedidoActivo.id), {
          estado: 'en_camino',
        });
      } else if (config.tipo === 'pedido_entregado') {
        await updateDoc(doc(db, 'pedidos', pedidoActivo.id), {
          estado: 'entregado',
          timestampEntrega: serverTimestamp(),
        });
      }

      setObservacion('');
      Alert.alert('Checkpoint Registrado', `Has completado: ${config.titulo}`);
    } catch (error) {
      console.error('Error al registrar checkpoint:', error);
      Alert.alert('Error', 'No se pudo registrar el checkpoint.');
    } finally {
      setProcesandoCheckpoint(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Módulo Domiciliario"
          title="Navegación & Checkpoints"
          subtitle="Seguimiento GPS en vivo y registro de puntos de control de la entrega."
        />

        {/* Mapa con OpenStreetMap */}
        <Card>
          <View style={styles.block}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Tu Ubicación GPS (OpenStreetMap)</Text>
            {ubicacion ? (
              <PlatformMap
                latitude={ubicacion.latitud}
                longitude={ubicacion.longitud}
                title="Tu posición actual"
                description="Domiciliario en ruta"
                height={200}
              />
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>Obteniendo posición GPS...</Text>
              </View>
            )}

            {permisoDenegado && (
              <View style={styles.block}>
                <Text style={{ color: theme.colors.error }}>Permiso de ubicación denegado.</Text>
                <Button texto="Abrir Configuración" onPress={() => Linking.openSettings()} />
              </View>
            )}

            {ubicacion && (
              <Text style={[styles.coordInfo, { color: theme.colors.textSecondary }]}>
                Lat: {ubicacion.latitud.toFixed(6)} | Lng: {ubicacion.longitud.toFixed(6)} | Precisión: ±{Math.round(ubicacion.precision)}m
              </Text>
            )}
          </View>
        </Card>

        {/* Información del pedido activo */}
        <Card>
          <View style={styles.block}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Pedido Activo</Text>
            {pedidoActivo ? (
              <View style={styles.block}>
                <Text style={[styles.linea, { color: theme.colors.text }]}>
                  ID: <Text style={{ fontWeight: 'normal', color: theme.colors.textSecondary }}>#{pedidoActivo.id.slice(0, 8)}</Text>
                </Text>
                <Text style={[styles.linea, { color: theme.colors.text }]}>
                  Estado: <Text style={{ fontWeight: 'normal', color: theme.colors.primary }}>{pedidoActivo.estado.replace('_', ' ')}</Text>
                </Text>
                <Text style={[styles.linea, { color: theme.colors.text }]}>
                  Dirección: <Text style={{ fontWeight: 'normal', color: theme.colors.textSecondary }}>{pedidoActivo.direccionEntrega?.direccion ?? 'Recogida en sede'}</Text>
                </Text>
                <Text style={[styles.linea, { color: theme.colors.text }]}>
                  Medicamentos: <Text style={{ fontWeight: 'normal', color: theme.colors.textSecondary }}>{pedidoActivo.medicamentos.map((m) => `${m.nombre} (x${m.cantidad})`).join(', ')}</Text>
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.colors.textSecondary }}>No tienes un pedido activo en curso.</Text>
            )}
          </View>
        </Card>

        {/* Registro del próximo Checkpoint */}
        {pedidoActivo && checkpointSiguiente && (
          <Card>
            <View style={styles.block}>
              <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Siguiente Checkpoint</Text>
              <Text style={[styles.cpTituloActivo, { color: theme.colors.primary }]}>
                {checkpointSiguiente.titulo}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                {checkpointSiguiente.descripcion}
              </Text>

              <TextInput
                style={[
                  styles.inputObs,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
                placeholder="Observación opcional (ej: Tráfico fluido, recibido por portería...)"
                placeholderTextColor={theme.colors.textSecondary}
                value={observacion}
                onChangeText={setObservacion}
              />

              <Button
                texto={`Completar: ${checkpointSiguiente.titulo}`}
                onPress={() => registrarCheckpoint(checkpointSiguiente)}
                loading={procesandoCheckpoint}
              />
            </View>
          </Card>
        )}

        {/* Línea de tiempo de Checkpoints */}
        {pedidoActivo && (
          <Card>
            <View style={styles.block}>
              <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Progreso de la Ruta</Text>
              <View style={styles.timeline}>
                {CHECKPOINTS_CONFIG.map((cfg, idx) => {
                  const completado = checkpoints.some((c) => c.tipo === cfg.tipo && c.estado === 'completado');
                  return (
                    <View key={cfg.tipo} style={styles.timelineRow}>
                      <Text style={[styles.checkIcon, { color: completado ? theme.colors.successText : theme.colors.textSecondary }]}>
                        {completado ? '✓' : '○'}
                      </Text>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTitle, { color: completado ? theme.colors.text : theme.colors.textSecondary }]}>
                          {cfg.titulo}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {completado ? 'Completado' : 'Pendiente'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  block: { gap: 8 },
  seccionTitulo: { fontSize: 16, fontWeight: '700' },
  loadingBox: { height: 160, justifyContent: 'center', alignItems: 'center' },
  coordInfo: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  linea: { fontWeight: '700', fontSize: 14 },
  cpTituloActivo: { fontSize: 15, fontWeight: '700' },
  inputObs: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginVertical: 6 },
  timeline: { gap: 10, marginTop: 6 },
  timelineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkIcon: { fontSize: 16, fontWeight: 'bold', width: 20 },
  timelineContent: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 13, fontWeight: '600' },
});
