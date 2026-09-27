import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/services/firebase/config';
import { medicationService } from '@/services/medication.service';
import type { ItemInventario, Pedido, RecetaMedica } from '@/types';

type EstadoCard = {
  pendientes: number;
  enCamino: number;
  entregadosHoy: number;
  recetasPendientes: number;
  stockBajo: number;
};

export default function DashboardAdminScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [recetas, setRecetas] = useState<RecetaMedica[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  useEffect(() => {
    const pedidosRef = query(collection(db, 'pedidos'), orderBy('timestampCreacion', 'desc'));
    const unsubPedidos = onSnapshot(
      pedidosRef,
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) }));
        setPedidos(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
        Alert.alert('Error', 'No fue posible cargar pedidos.');
      }
    );

    const unsubRecetas = onSnapshot(
      collection(db, 'recetas'),
      (snapshot) => {
        setRecetas(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecetaMedica, 'id'>) } as RecetaMedica)));
      },
      (err) => console.warn('Error recetas:', err)
    );

    const unsubInventario = medicationService.escucharInventario((items) => {
      setInventario(items);
    });

    return () => {
      unsubPedidos();
      unsubRecetas();
      unsubInventario();
    };
  }, []);

  const metricas = useMemo<EstadoCard>(() => {
    const hoy = new Date();
    const base = pedidos.reduce(
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
      { pendientes: 0, enCamino: 0, entregadosHoy: 0, recetasPendientes: 0, stockBajo: 0 }
    );

    base.recetasPendientes = recetas.filter((r) => r.estado === 'pendiente').length;
    base.stockBajo = inventario.filter((i) => i.stock <= i.stockMinimo).length;

    return base;
  }, [pedidos, recetas, inventario]);

  const pedidosRecientes = useMemo(() => pedidos.slice(0, 8), [pedidos]);

  const estadoColor = (estado: string) => {
    if (estado === 'pendiente') return styles.chipPendiente;
    if (estado === 'en_camino') return styles.chipCamino;
    if (estado === 'listo') return styles.chipListo;
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
          title="Panel Administrador"
          subtitle="Monitorea pedidos, fórmulas médicas, alertas de stock y operaciones de farmacia."
        />

        <View style={styles.metricasRow}>
          <View style={styles.metricItem}>
            <Card>
              <View style={[styles.metricCard, styles.metricPendiente]}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.pendientes}</Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Pedidos Pend.</Text>
              </View>
            </Card>
          </View>
          <View style={styles.metricItem}>
            <Card>
              <View style={[styles.metricCard, styles.metricRecetas]}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.recetasPendientes}</Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Recetas Pend.</Text>
              </View>
            </Card>
          </View>
          <View style={styles.metricItem}>
            <Card>
              <View style={[styles.metricCard, styles.metricStock]}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.stockBajo}</Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Stock Bajo</Text>
              </View>
            </Card>
          </View>
        </View>

        {/* Pedidos recientes */}
        <Card>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pedidos Recientes</Text>
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
                  <View style={styles.pedidoHeaderRow}>
                    <Text style={[styles.chipEstado, estadoColor(pedido.estado)]}>
                      {pedido.estado.replace('_', ' ')}
                    </Text>
                    {pedido.recetaEstado ? (
                      <Text style={[styles.recetaTag, { color: theme.colors.primary }]}>
                        Receta: {pedido.recetaEstado}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
                    Afiliado ID: {pedido.usuarioId}
                  </Text>
                  <Text style={[styles.rowText, { color: theme.colors.text }]}>
                    Medicamentos: {pedido.medicamentos.map((m) => `${m.nombre} (${m.cantidad})`).join(', ') || 'Sin medicamentos'}
                  </Text>
                  <Text style={[styles.rowTime, { color: theme.colors.textSecondary }]}>
                    Hace {tiempoTranscurrido(pedido)}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>No hay pedidos recientes.</Text>
            )}
          </View>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Acciones del Sistema</Text>
            <Button texto="Ver Reportes Operativos" onPress={() => router.push('/(administrador)/reportes')} />
            <Button texto="Gestión de Usuarios y Roles" onPress={() => router.push('/(administrador)/usuarios' as any)} variant="secundario" />
            <Button texto="Gestión de Catálogo e Inventario (Seeder)" onPress={() => router.push('/(administrador)/inventario' as any)} variant="secundario" />
            <Button texto="Gestión de PQRS" onPress={() => router.push('/(administrador)/pqrs')} variant="secundario" />
          </View>
        </Card>
      </ScrollView>

      {/* Modal Detalle Pedido */}
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Detalle del Pedido</Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              ID: {pedidoSeleccionado?.id}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Estado: {pedidoSeleccionado?.estado.replace('_', ' ')}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Modo de entrega: {pedidoSeleccionado?.modoEntrega}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Dirección: {pedidoSeleccionado?.direccionEntrega?.direccion ?? 'No aplica'}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.textSecondary }]}>
              Receta médica: {pedidoSeleccionado?.recetaId ? 'Adjunta' : 'No requerida'}
            </Text>
            <Text style={[styles.rowText, { color: theme.colors.text }]}>
              Medicamentos: {pedidoSeleccionado?.medicamentos.map((m) => `${m.nombre} x${m.cantidad}`).join(', ')}
            </Text>
            {pedidoSeleccionado?.evidenciaEntregaUrl ? (
              <View style={styles.evidenciaBox}>
                <Text style={[styles.evidenciaTitulo, { color: theme.colors.text }]}>Evidencia de Entrega:</Text>
                <Image source={{ uri: pedidoSeleccionado.evidenciaEntregaUrl }} style={styles.evidenciaImg} />
              </View>
            ) : null}
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
    minHeight: 88,
    justifyContent: 'space-between',
  },
  metricValue: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  metricLabel: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  metricPendiente: { borderTopWidth: 4, borderTopColor: '#d97706', paddingTop: 8 },
  metricRecetas: { borderTopWidth: 4, borderTopColor: '#2563eb', paddingTop: 8 },
  metricStock: { borderTopWidth: 4, borderTopColor: '#dc2626', paddingTop: 8 },
  section: { gap: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 16 },
  rowPedido: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  pedidoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipEstado: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  chipPendiente: { backgroundColor: '#d97706' },
  chipCamino: { backgroundColor: '#0f766e' },
  chipListo: { backgroundColor: '#2563eb' },
  chipEntregado: { backgroundColor: '#16a34a' },
  chipCancelado: { backgroundColor: '#b91c1c' },
  recetaTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowText: { fontSize: 13, lineHeight: 18 },
  rowTime: { fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  evidenciaBox: {
    gap: 6,
    marginVertical: 4,
  },
  evidenciaTitulo: {
    fontSize: 13,
    fontWeight: '700',
  },
  evidenciaImg: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});
