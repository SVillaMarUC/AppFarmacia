import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { useTheme } from '@/context/ThemeContext';
import { medicationService } from '@/services/medication.service';
import type { ItemInventario } from '@/types';

export default function InventarioAdminScreen() {
  const { theme } = useTheme();
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoSeeder, setCargandoSeeder] = useState(false);

  useEffect(() => {
    const unsub = medicationService.escucharInventario((items) => {
      setInventario(items);
      setCargando(false);
      setRefrescando(false);
    });

    return () => unsub();
  }, []);

  const handleCargarIniciales = () => {
    Alert.alert(
      'Cargar Medicamentos Iniciales',
      '¿Deseas verificar y registrar la lista inicial de medicamentos en Firestore?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            try {
              setCargandoSeeder(true);
              const nuevos = await medicationService.cargarMedicamentosIniciales();

              if (nuevos === 0) {
                Alert.alert('Inventario al día', 'Los medicamentos iniciales ya se encuentran registrados en la base de datos.');
              } else {
                Alert.alert('Éxito', `Se registraron ${nuevos} medicamentos correctamente.`);
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cargar la lista inicial de medicamentos.');
            } finally {
              setCargandoSeeder(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefrescando(true);
    setTimeout(() => setRefrescando(false), 800);
  };

  const renderItem = ({ item }: { item: ItemInventario }) => {
    return (
      <Card>
        <View style={[styles.cardItem, !item.activo && styles.cardInactivo]}>
          <View style={styles.headerCard}>
            <Text style={[styles.nombre, { color: theme.colors.text }]}>{item.nombre}</Text>
            <StockIndicator stock={item.stock} stockMinimo={item.stockMinimo} fechaVencimiento={item.fechaVencimiento} />
          </View>

          <Text style={[styles.subtexto, { color: theme.colors.textSecondary }]}>
            Principio Activo: {item.principioActivo || 'N/A'}
          </Text>

          <View style={styles.detallesRow}>
            <Text style={[styles.subtexto, { color: theme.colors.textSecondary }]}>
              {item.concentracion ? `${item.concentracion} | ` : ''}
              {item.presentacion || 'Sin presentación'}
            </Text>

            {item.requiereReceta && (
              <View style={[styles.badgeReceta, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[styles.textReceta, { color: theme.colors.primary }]}>Requiere Receta</Text>
              </View>
            )}
          </View>

          {item.lote ? (
            <Text style={[styles.loteText, { color: theme.colors.textMuted }]}>
              Lote: {item.lote} | Vence: {item.fechaVencimiento ? String(item.fechaVencimiento).slice(0, 10) : 'N/A'}
            </Text>
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Módulo Administrador"
          title="Gestión de Catálogo e Inventario"
          subtitle="Monitorea existencias globales y ejecuta la siembra inicial de medicamentos."
        />

        <View style={styles.accionWrap}>
          <Button
            texto={cargandoSeeder ? 'Cargando medicamentos...' : 'Cargar Medicamentos Iniciales (Seeder)'}
            onPress={handleCargarIniciales}
            loading={cargandoSeeder}
          />
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={inventario}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
            }
            ListEmptyComponent={
              <Card>
                <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                  No hay medicamentos en el inventario. Presiona el botón superior para cargar el catálogo inicial.
                </Text>
              </Card>
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  accionWrap: { marginBottom: 8 },
  list: { gap: 10, paddingBottom: 24 },
  cardItem: { gap: 6 },
  cardInactivo: { opacity: 0.5 },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '700', flex: 1 },
  subtexto: { fontSize: 13 },
  detallesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  badgeReceta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  textReceta: { fontSize: 11, fontWeight: '700' },
  loteText: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
});
