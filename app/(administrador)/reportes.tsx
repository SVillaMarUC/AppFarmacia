import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
    const enCamino = pedidos.filter((p) => p.estado === 'en_camino').length;
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_preparacion').length;
    const tasaEntrega = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;

    const totalRecetas = recetas.length;
    const aprobadas = recetas.filter((r) => r.estado === 'aprobada').length;
    const rechazadas = recetas.filter((r) => r.estado === 'rechazada').length;
    const pendientesReceta = recetas.filter((r) => r.estado === 'pendiente' || r.estado === 'revision').length;

    const totalMedicamentos = inventario.length;
    const stockBajo = inventario.filter((i) => i.stock <= i.stockMinimo);
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
                <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                  📦 Operación de Pedidos ({stats.totalPedidos} total)
                </Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{stats.entregados}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Entregados</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: '#0f766e' }]}>{stats.enCamino}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>En Camino</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>{stats.pendientes}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>En Proceso</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.successText }]}>{stats.tasaEntrega}%</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Efectividad</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Fórmulas Médicas */}
            <Card>
              <View style={styles.block}>
                <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                  📋 Validación de Recetas Médicas ({stats.totalRecetas} total)
                </Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.successText }]}>{stats.aprobadas}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Aprobadas</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: theme.colors.error }]}>{stats.rechazadas}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Rechazadas</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>{stats.pendientesReceta}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Por Validar</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Alertas de Inventario */}
            <Card>
              <View style={styles.block}>
                <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>
                  ⚠️ Alertas Críticas de Inventario
                </Text>

                {stats.stockAgotado.length > 0 && (
                  <View style={styles.alertaSeccion}>
                    <Text style={[styles.subAlerta, { color: theme.colors.error }]}>
                      ● {stats.stockAgotado.length} Medicamento(s) Agotados:
                    </Text>
                    {stats.stockAgotado.map((m) => (
                      <Text key={m.id} style={[styles.itemAlerta, { color: theme.colors.text }]}>
                        • {m.nombre} (Stock: 0 / Mín: {m.stockMinimo})
                      </Text>
                    ))}
                  </View>
                )}

                {stats.stockBajo.length > 0 && (
                  <View style={styles.alertaSeccion}>
                    <Text style={[styles.subAlerta, { color: '#d97706' }]}>
                      ● {stats.stockBajo.length} Medicamento(s) con Stock Bajo:
                    </Text>
                    {stats.stockBajo.slice(0, 5).map((m) => (
                      <Text key={m.id} style={[styles.itemAlerta, { color: theme.colors.text }]}>
                        • {m.nombre} — Stock actual: {m.stock} (Mínimo: {m.stockMinimo})
                      </Text>
                    ))}
                  </View>
                )}

                {stats.proximosVencer.length > 0 && (
                  <View style={styles.alertaSeccion}>
                    <Text style={[styles.subAlerta, { color: '#dc2626' }]}>
                      ● {stats.proximosVencer.length} Medicamento(s) Próximos a Vencer (30 días):
                    </Text>
                    {stats.proximosVencer.map((m) => (
                      <Text key={m.id} style={[styles.itemAlerta, { color: theme.colors.text }]}>
                        • {m.nombre} — Lote: {m.lote || 'N/A'} (Vence: {String(m.fechaVencimiento).slice(0, 10)})
                      </Text>
                    ))}
                  </View>
                )}

                {stats.stockAgotado.length === 0 && stats.stockBajo.length === 0 && stats.proximosVencer.length === 0 && (
                  <Text style={{ color: theme.colors.successText, fontSize: 13 }}>
                    ✓ Todas las existencias se encuentran en niveles óptimos y con fechas vigentes.
                  </Text>
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
  block: { gap: 10 },
  seccionTitulo: { fontSize: 16, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kpiBox: { flex: 1, minWidth: 75, padding: 10, borderRadius: 10, alignItems: 'center', gap: 2 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 11, textAlign: 'center' },
  alertaSeccion: { gap: 4, marginTop: 4 },
  subAlerta: { fontSize: 13, fontWeight: '700' },
  itemAlerta: { fontSize: 13, paddingLeft: 8 },
});
