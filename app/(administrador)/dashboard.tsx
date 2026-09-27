import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
        if (pedido.estado === 'pendiente' || pedido.estado === 'en_preparacion') {
          acc.pendientes += 1;
        }
        if (pedido.estado === 'en_camino' || pedido.estado === 'asignado') {
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

    base.recetasPendientes = recetas.filter((r) => r.estado === 'pendiente' || r.estado === 'revision').length;
    base.stockBajo = inventario.filter((i) => i.stock <= i.stockMinimo).length;

    return base;
  }, [pedidos, recetas, inventario]);

  const pedidosRecientes = useMemo(() => pedidos.slice(0, 8), [pedidos]);

  const estadoBadgeConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { label: 'Pendiente', bg: '#fef3c7', text: '#b45309' };
      case 'en_preparacion':
        return { label: 'En Preparación', bg: '#eff6ff', text: '#1d4ed8' };
      case 'listo':
        return { label: 'Listo', bg: '#dbeafe', text: '#2563eb' };
      case 'asignado':
        return { label: 'Asignado', bg: '#e0e7ff', text: '#4338ca' };
      case 'en_camino':
        return { label: 'En Camino', bg: '#ccfbf1', text: '#0f766e' };
      case 'entregado':
        return { label: 'Entregado', bg: '#dcfce7', text: '#15803d' };
      default:
        return { label: estado, bg: '#fee2e2', text: '#b91c1c' };
    }
  };

  const tiempoTranscurrido = (pedido: Pedido) => {
    const raw = pedido.timestampCreacion;
    if (!raw || typeof raw !== 'object' || !('toDate' in raw)) {
      return 'Reciente';
    }
    const diffMs = Date.now() - raw.toDate().getTime();
    const min = Math.max(1, Math.round(diffMs / 60000));
    if (min < 60) return `${min}m`;
    const horas = Math.round(min / 60);
    if (horas < 24) return `${horas}h`;
    return `${Math.round(horas / 24)}d`;
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Gestión y Control"
          title="Panel Administrador"
          subtitle="Monitorea pedidos, fórmulas médicas, alertas de stock y operaciones globales."
        />

        {/* Métricas Principales */}
        <View style={styles.metricasRow}>
          <View style={styles.metricItem}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time" size={18} color="#d97706" />
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.pendientes}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Por Despachar</Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="document-text" size={18} color="#2563eb" />
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.recetasPendientes}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Recetas Pend.</Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{metricas.stockBajo}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Stock Bajo</Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas del Sistema */}
        <Card>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Módulos y Gestión</Text>
            <View style={styles.gridAcciones}>
              <TouchableOpacity
                style={[styles.tileAccion, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                onPress={() => router.push('/(administrador)/reportes')}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="bar-chart" size={20} color="#2563eb" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitulo, { color: theme.colors.text }]}>Reportes Operativos</Text>
                  <Text style={[styles.tileSub, { color: theme.colors.textSecondary }]}>Métricas de entrega y stock</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tileAccion, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                onPress={() => router.push('/(administrador)/usuarios' as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="people" size={20} color="#16a34a" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitulo, { color: theme.colors.text }]}>Gestión de Usuarios</Text>
                  <Text style={[styles.tileSub, { color: theme.colors.textSecondary }]}>Roles y accesos del personal</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tileAccion, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                onPress={() => router.push('/(administrador)/inventario' as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="cube" size={20} color="#d97706" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitulo, { color: theme.colors.text }]}>Catálogo & Seeder</Text>
                  <Text style={[styles.tileSub, { color: theme.colors.textSecondary }]}>Medicamentos iniciales</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tileAccion, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                onPress={() => router.push('/(administrador)/pqrs')}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIcon, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="chatbubbles" size={20} color="#7c3aed" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitulo, { color: theme.colors.text }]}>Gestión de PQRS</Text>
                  <Text style={[styles.tileSub, { color: theme.colors.textSecondary }]}>Peticiones y reclamos</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Pedidos recientes */}
        <Card>
          <View style={styles.section}>
            <View style={styles.pedidosHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pedidos Recientes</Text>
              <Text style={[styles.conteoHeader, { color: theme.colors.textSecondary }]}>
                {pedidos.length} pedidos totales
              </Text>
            </View>

            {pedidosRecientes.length ? (
              pedidosRecientes.map((pedido) => {
                const badge = estadoBadgeConfig(pedido.estado);
                return (
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
                      <View style={styles.idWrap}>
                        <Text style={[styles.pedidoIdText, { color: theme.colors.text }]}>
                          #{pedido.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <View style={[styles.badgeEstado, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeEstadoText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.rowTime, { color: theme.colors.textSecondary }]}>
                        Hace {tiempoTranscurrido(pedido)}
                      </Text>
                    </View>

                    <View style={styles.pedidoInfoRow}>
                      <Ionicons name="person-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.rowTextSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        Afiliado ID: {pedido.usuarioId.slice(0, 12)}...
                      </Text>
                    </View>

                    <View style={styles.pedidoInfoRow}>
                      <Ionicons name="medkit-outline" size={13} color={theme.colors.primary} />
                      <Text style={[styles.rowTextMeds, { color: theme.colors.text }]} numberOfLines={1}>
                        {pedido.medicamentos.map((m) => `${m.nombre} (${m.cantidad})`).join(', ') || 'Sin medicamentos'}
                      </Text>
                    </View>

                    <View style={styles.pedidoFooterRow}>
                      <View style={styles.modoBadge}>
                        <Ionicons
                          name={pedido.modoEntrega === 'domicilio' ? 'bicycle-outline' : 'business-outline'}
                          size={12}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={[styles.modoText, { color: theme.colors.textSecondary }]}>
                          {pedido.modoEntrega === 'domicilio' ? 'A Domicilio' : 'Recogida Sede'}
                        </Text>
                      </View>

                      {pedido.recetaEstado ? (
                        <Text style={[styles.recetaTag, { color: theme.colors.primary }]}>
                          Rx: {pedido.recetaEstado}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text style={[styles.rowTextEmpty, { color: theme.colors.textSecondary }]}>
                No hay pedidos registrados en el sistema.
              </Text>
            )}
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
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detalle del Pedido</Text>
              <TouchableOpacity onPress={() => setPedidoSeleccionado(null)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>ID:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.colors.text }]}>{pedidoSeleccionado?.id}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>Estado:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.colors.primary, textTransform: 'capitalize' }]}>
                  {pedidoSeleccionado?.estado.replace('_', ' ')}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>Modo de entrega:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.colors.text }]}>
                  {pedidoSeleccionado?.modoEntrega === 'domicilio' ? 'A Domicilio' : 'Recogida en Sede'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>Dirección:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.colors.text }]}>
                  {pedidoSeleccionado?.direccionEntrega?.direccion ?? 'No aplica'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>Fórmula Médica:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.colors.text }]}>
                  {pedidoSeleccionado?.recetaId ? 'Adjunta' : 'No requerida'}
                </Text>
              </View>

              <View style={styles.medsDetailSection}>
                <Text style={[styles.modalDetailLabel, { color: theme.colors.textSecondary }]}>Medicamentos:</Text>
                {pedidoSeleccionado?.medicamentos.map((m, idx) => (
                  <Text key={idx} style={[styles.medItemLine, { color: theme.colors.text }]}>
                    • {m.nombre} x{m.cantidad} {m.concentracion ? `(${m.concentracion})` : ''}
                  </Text>
                ))}
              </View>

              {pedidoSeleccionado?.evidenciaEntregaUrl ? (
                <View style={styles.evidenciaBox}>
                  <Text style={[styles.evidenciaTitulo, { color: theme.colors.text }]}>Evidencia de Entrega:</Text>
                  <Image source={{ uri: pedidoSeleccionado.evidenciaEntregaUrl }} style={styles.evidenciaImg} />
                </View>
              ) : null}

              <View style={{ marginTop: 8 }}>
                <Button texto="Cerrar" onPress={() => setPedidoSeleccionado(null)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  metricasRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  metricItem: { flex: 1 },
  metricCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: {
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  section: { gap: 12 },
  sectionTitle: { fontWeight: '800', fontSize: 16 },
  pedidosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conteoHeader: { fontSize: 12 },
  gridAcciones: {
    gap: 8,
  },
  tileAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileInfo: { flex: 1, gap: 2 },
  tileTitulo: { fontSize: 14, fontWeight: '700' },
  tileSub: { fontSize: 12 },
  rowPedido: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  pedidoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pedidoIdText: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeEstadoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pedidoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTextSub: { fontSize: 12 },
  rowTextMeds: { fontSize: 13, fontWeight: '500' },
  pedidoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  modoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modoText: { fontSize: 11 },
  recetaTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowTime: { fontSize: 11 },
  rowTextEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    padding: 16,
    gap: 8,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  modalDetailLabel: { fontSize: 13, fontWeight: '600' },
  modalDetailValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  medsDetailSection: {
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  medItemLine: { fontSize: 13, paddingLeft: 4 },
  evidenciaBox: {
    gap: 6,
    marginTop: 6,
  },
  evidenciaTitulo: {
    fontSize: 13,
    fontWeight: '700',
  },
  evidenciaImg: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});
