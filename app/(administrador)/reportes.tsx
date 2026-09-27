import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/services/firebase/config';
import { medicationService } from '@/services/medication.service';
import type { ItemInventario, Pedido, RecetaMedica } from '@/types';

export default function ReportesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [recetas, setRecetas] = useState<RecetaMedica[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);

  useEffect(() => {
    const unsubPedidos = onSnapshot(collection(db, 'pedidos'), (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) })));
      setLoading(false);
    });

    const unsubRecetas = onSnapshot(collection(db, 'recetas'), (snap) => {
      setRecetas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecetaMedica, 'id'>) })));
    });

    const unsubInventario = medicationService.escucharInventario((items) => {
      setInventario(items);
    });

    return () => {
      unsubPedidos();
      unsubRecetas();
      unsubInventario();
    };
  }, []);

  const stats = useMemo(() => {
    const totalPedidos = pedidos.length;
    const entregados = pedidos.filter((p) => p.estado === 'entregado').length;
    const enCamino = pedidos.filter((p) => p.estado === 'en_camino' || p.estado === 'asignado').length;
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_preparacion').length;
    const tasaEntrega = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;

    const totalRecetas = recetas.length;
    const aprobadas = recetas.filter((r) => r.estado === 'aprobada').length;
    const rechazadas = recetas.filter((r) => r.estado === 'rechazada').length;
    const pendientesReceta = recetas.filter((r) => r.estado === 'pendiente' || r.estado === 'revision').length;

    const totalMedicamentos = inventario.length;
    const stockBajo = inventario.filter((i) => i.stock <= i.stockMinimo && i.stock > 0);
    const stockAgotado = inventario.filter((i) => i.stock <= 0);
    const proximosVencer = inventario.filter((i) => {
      const ev = medicationService.evaluarVencimiento(i.fechaVencimiento);
      return ev.estado === 'proximo_a_vencer' || ev.estado === 'vencido';
    });

    return {
      totalPedidos,
      entregados,
      enCamino,
      pendientes,
      tasaEntrega,
      totalRecetas,
      aprobadas,
      rechazadas,
      pendientesReceta,
      totalMedicamentos,
      stockBajo,
      stockAgotado,
      proximosVencer,
    };
  }, [pedidos, recetas, inventario]);

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Auditoría y Desempeño"
          title="Reportes Operativos"
          subtitle="Métricas operacionales de despacho, fórmulas médicas y rotación de inventario en tiempo real."
        />

        <Button texto="← Volver al Dashboard" onPress={() => router.back()} variant="secundario" />

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Resumen de Pedidos */}
            <Card>
              <View style={styles.block}>
                <View style={styles.seccionHeader}>
                  <Ionicons name="cube" size={20} color={theme.colors.primary} />
                  <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                    Operación de Pedidos ({stats.totalPedidos} total)
                  </Text>
                </View>

                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#16a34a' }]}>{stats.entregados}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Entregados</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#0f766e' }]}>{stats.enCamino}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>En Camino</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>{stats.pendientes}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>En Proceso</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{stats.tasaEntrega}%</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Efectividad</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Fórmulas Médicas */}
            <Card>
              <View style={styles.block}>
                <View style={styles.seccionHeader}>
                  <Ionicons name="document-text" size={20} color="#2563eb" />
                  <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                    Validación de Recetas Médicas ({stats.totalRecetas} total)
                  </Text>
                </View>

                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#16a34a' }]}>{stats.aprobadas}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Aprobadas</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{stats.rechazadas}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Rechazadas</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>{stats.pendientesReceta}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Por Validar</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
                      {stats.totalRecetas > 0 ? `${Math.round((stats.aprobadas / stats.totalRecetas) * 100)}%` : '0%'}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Tasa Aprobación</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Alertas de Inventario */}
            <Card>
              <View style={styles.block}>
                <View style={styles.seccionHeader}>
                  <Ionicons name="warning" size={20} color="#d97706" />
                  <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                    Alertas de Inventario
                  </Text>
                </View>

                {stats.stockAgotado.length > 0 && (
                  <View style={styles.alertaBloque}>
                    <View style={styles.alertaTituloRow}>
                      <View style={[styles.alertaBadge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.alertaBadgeText, { color: '#b91c1c' }]}>
                          {stats.stockAgotado.length} Agotados
                        </Text>
                      </View>
                    </View>
                    {stats.stockAgotado.map((m) => (
                      <View key={m.id} style={[styles.itemAlertaCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary }]}>
                        <Text style={[styles.itemAlertaNombre, { color: theme.colors.text }]}>
                          {m.nombre}
                        </Text>
                        <Text style={[styles.itemAlertaStock, { color: theme.colors.error }]}>
                          Stock: 0 / Mín: {m.stockMinimo}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {stats.stockBajo.length > 0 && (
                  <View style={styles.alertaBloque}>
                    <View style={styles.alertaTituloRow}>
                      <View style={[styles.alertaBadge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.alertaBadgeText, { color: '#b45309' }]}>
                          {stats.stockBajo.length} Con Stock Bajo
                        </Text>
                      </View>
                    </View>
                    {stats.stockBajo.slice(0, 5).map((m) => (
                      <View key={m.id} style={[styles.itemAlertaCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary }]}>
                        <Text style={[styles.itemAlertaNombre, { color: theme.colors.text }]}>
                          {m.nombre}
                        </Text>
                        <Text style={[styles.itemAlertaStock, { color: '#d97706' }]}>
                          Stock actual: {m.stock} (Mín: {m.stockMinimo})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {stats.proximosVencer.length > 0 && (
                  <View style={styles.alertaBloque}>
                    <View style={styles.alertaTituloRow}>
                      <View style={[styles.alertaBadge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.alertaBadgeText, { color: '#b91c1c' }]}>
                          {stats.proximosVencer.length} Próximos a Vencer
                        </Text>
                      </View>
                    </View>
                    {stats.proximosVencer.map((m) => (
                      <View key={m.id} style={[styles.itemAlertaCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary }]}>
                        <Text style={[styles.itemAlertaNombre, { color: theme.colors.text }]}>
                          {m.nombre}
                        </Text>
                        <Text style={[styles.itemAlertaStock, { color: '#dc2626' }]}>
                          Vence: {String(m.fechaVencimiento).slice(0, 10)} · Lote: {m.lote || 'N/A'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {stats.stockAgotado.length === 0 && stats.stockBajo.length === 0 && stats.proximosVencer.length === 0 && (
                  <View style={styles.okState}>
                    <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                    <Text style={{ color: theme.colors.successText, fontSize: 13, fontWeight: '600' }}>
                      Todas las existencias se encuentran en niveles óptimos y con fechas vigentes.
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  block: { gap: 12 },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccionTitulo: { fontSize: 15, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kpiCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 11, textAlign: 'center', fontWeight: '600' },
  alertaBloque: { gap: 6, marginTop: 2 },
  alertaTituloRow: { flexDirection: 'row', alignItems: 'center' },
  alertaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  alertaBadgeText: { fontSize: 11, fontWeight: '700' },
  itemAlertaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemAlertaNombre: { fontSize: 13, fontWeight: '600', flex: 1 },
  itemAlertaStock: { fontSize: 12, fontWeight: '700' },
  okState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
});
