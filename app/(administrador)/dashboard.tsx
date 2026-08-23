import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

type EstadoCard = {
  pendientes: number;
  enCamino: number;
  entregadosHoy: number;
};

export default function DashboardAdminScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  useEffect(() => {
    const pedidosRef = query(collection(db, 'pedidos'), orderBy('timestampCreacion', 'desc'));
    const unsub = onSnapshot(
      pedidosRef,
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) }));
        setPedidos(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
        Alert.alert('Error', 'No fue posible cargar el dashboard.');
      }
    );

    return unsub;
  }, []);

  const metricas = useMemo<EstadoCard>(() => {
    const hoy = new Date();
    return pedidos.reduce(
      (acc, pedido) => {
        if (pedido.estado === 'pendiente') {
          acc.pendientes += 1;
        }
        if (pedido.estado === 'en_camino') {
          acc.enCamino += 1;
        }
        if (pedido.estado === 'entregado' && pedido.timestampEntrega) {
          const fechaEntrega = pedido.timestampEntrega.toDate();
          if (
            fechaEntrega.getDate() === hoy.getDate() &&
            fechaEntrega.getMonth() === hoy.getMonth() &&
            fechaEntrega.getFullYear() === hoy.getFullYear()
          ) {
            acc.entregadosHoy += 1;
          }
        }
        return acc;
      },
      { pendientes: 0, enCamino: 0, entregadosHoy: 0 }
    );
  }, [pedidos]);

  const pedidosRecientes = useMemo(() => pedidos.slice(0, 10), [pedidos]);

  const estadoColor = (estado: string) => {
    if (estado === 'pendiente') return styles.chipPendiente;
    if (estado === 'en_camino') return styles.chipCamino;
    if (estado === 'entregado') return styles.chipEntregado;
    return styles.chipCancelado;
  };

  const tiempoTranscurrido = (pedido: Pedido) => {
    const raw = pedido.timestampCreacion;
    if (!raw || typeof raw !== 'object' || !('toDate' in raw)) {
      return 'Sin fecha';
    }
    const diffMs = Date.now() - raw.toDate().getTime();
    const min = Math.max(1, Math.round(diffMs / 60000));
    if (min < 60) return `${min} min`;
    return `${Math.round(min / 60)} h`;
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Gestión y Control"
          title="Panel administrador"
          subtitle="Monitorea el flujo operativo de solicitudes, preparación y entregas."
        />

        <View style={styles.metricasRow}>
          {loading ? (
            <>
              <View style={styles.metricItem}>
                <View style={[styles.skeletonCard, styles.metricCard, { backgroundColor: theme.colors.surfaceSecondary }]} />
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.skeletonCard, styles.metricCard, { backgroundColor: theme.colors.surfaceSecondary }]} />
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.skeletonCard, styles.metricCard, { backgroundColor: theme.colors.surfaceSecondary }]} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.metricItem}>
                <Card>
                  <View style={[styles.metricCard, styles.metricPendiente]}>
                    <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.pendientes}</Text>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      Pend.
                    </Text>
                  </View>
                </Card>
              </View>
              <View style={styles.metricItem}>
                <Card>
                  <View style={[styles.metricCard, styles.metricCamino]}>
                    <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.enCamino}</Text>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      Camino
                    </Text>
                  </View>
                </Card>
              </View>
              <View style={styles.metricItem}>
                <Card>
                  <View style={[styles.metricCard, styles.metricEntregado]}>
                    <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.entregadosHoy}</Text>
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      Hoy
                    </Text>
                  </View>
                </Card>
              </View>
            </>
          )}
        </View>

        <Card>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pedidos recientes</Text>
            {pedidosRecientes.length ? (
              pedidosRecientes.map((pedido) => (
                <Pressable
                  key={pedido.id}
                  style={[
                    styles.rowPedido,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => setPedidoSeleccionado(pedido)}
                >
                  <Text style={[styles.chipEstado, estadoColor(pedido.estado)]}>{pedido.estado.replace('_', ' ')}</Text>
                  <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>Afiliado: {pedido.usuarioId}</Text>
                  <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
                    Medicamentos: {pedido.medicamentos.map((m) => m.nombre).join(', ') || 'Sin medicamentos'}
                  </Text>
                  <Text style={[styles.rowTime, { color: theme.colors.text }]}>Hace {tiempoTranscurrido(pedido)}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>No hay pedidos recientes.</Text>
            )}
          </View>
        </Card>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <Card>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Acciones rápidas</Text>
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
              Consulta indicadores y tendencias operativas.
            </Text>
            <Button texto="Ver reportes" onPress={() => router.push('/(administrador)/reportes')} />
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
              Revisa solicitudes de soporte y seguimiento.
            </Text>
            <Button texto="PQRS" onPress={() => router.push('/(administrador)/pqrs')} variant="secundario" />
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
              Administración de perfiles y permisos.
            </Text>
            <Button texto="Gestionar usuarios" onPress={() => Alert.alert('Próximamente')} variant="secundario" />
          </View>
        </Card>
      </ScrollView>

      <Modal visible={Boolean(pedidoSeleccionado)} transparent animationType="fade" onRequestClose={() => setPedidoSeleccionado(null)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Detalle del pedido</Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Estado: {pedidoSeleccionado?.estado.replace('_', ' ')}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Afiliado: {pedidoSeleccionado?.usuarioId}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Modo de entrega: {pedidoSeleccionado?.modoEntrega}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Dirección: {pedidoSeleccionado?.direccionEntrega?.direccion ?? 'No aplica'}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Medicamentos: {pedidoSeleccionado?.medicamentos.map((m) => `${m.nombre} (${m.cantidad})`).join(', ')}
            </Text>
            <Button texto="Cerrar" onPress={() => setPedidoSeleccionado(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  metricasRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  metricItem: { flex: 1 },
  metricCard: {
    flex: 1,
    minHeight: 92,
    justifyContent: 'space-between',
  },
  metricValue: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  metricLabel: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
    minHeight: 18,
    textAlign: 'center',
  },
  metricPendiente: { borderTopWidth: 4, borderTopColor: '#d97706', paddingTop: 8 },
  metricCamino: { borderTopWidth: 4, borderTopColor: '#0f766e', paddingTop: 8 },
  metricEntregado: { borderTopWidth: 4, borderTopColor: '#16a34a', paddingTop: 8 },
  skeletonCard: { borderRadius: 14 },
  section: { gap: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 16 },
  rowPedido: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  chipEstado: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  chipPendiente: { backgroundColor: '#d97706' },
  chipCamino: { backgroundColor: '#0f766e' },
  chipEntregado: { backgroundColor: '#16a34a' },
  chipCancelado: { backgroundColor: '#b91c1c' },
  rowText: { fontSize: 14, lineHeight: 20 },
  rowTime: { fontWeight: '600', fontSize: 14 },
  divider: { height: 1, marginVertical: 4 },
  desc: { marginTop: 2, fontSize: 14, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
});

