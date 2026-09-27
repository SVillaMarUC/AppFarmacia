import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { useTheme } from '@/context/ThemeContext';
import type { ItemInventario, Medicamento } from '@/types';

interface CatalogoPickerProps {
  catalogo: ItemInventario[];
  cargando: boolean;
  medicamentosSeleccionados: Medicamento[];
  onAgregar: (item: ItemInventario) => void;
}

export function CatalogoPicker({
  catalogo,
  cargando,
  medicamentosSeleccionados,
  onAgregar,
}: CatalogoPickerProps) {
  const { theme } = useTheme();
  const [busqueda, setBusqueda] = useState('');

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        (m.principioActivo && m.principioActivo.toLowerCase().includes(q)) ||
        (m.presentacion && m.presentacion.toLowerCase().includes(q))
    );
  }, [catalogo, busqueda]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Buscar por nombre, principio activo..."
          placeholderTextColor={theme.colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
        />
        {busqueda ? (
          <Pressable onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 6, fontSize: 13 }}>
            Cargando catálogo farmacéutico...
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {catalogoFiltrado.map((item) => {
            const yaSeleccionado = medicamentosSeleccionados.some(
              (m) => m.medicamentoId === item.id
            );
            const cantSeleccionada =
              medicamentosSeleccionados.find((m) => m.medicamentoId === item.id)?.cantidad ?? 0;

            return (
              <Card key={item.id}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemNombre, { color: theme.colors.text }]}>
                      {item.nombre}
                    </Text>
                    <Text style={[styles.itemDetalle, { color: theme.colors.textSecondary }]}>
                      {item.presentacion || item.concentracion || 'Sin especificación'}
                    </Text>
                    <View style={styles.badgeRow}>
                      <StockIndicator stock={item.stock} stockMinimo={item.stockMinimo} />
                      {item.requiereReceta && (
                        <View style={styles.rxBadge}>
                          <Text style={styles.rxText}>Requiere Receta (Rx)</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.addBtn,
                      {
                        backgroundColor: yaSeleccionado
                          ? theme.colors.successBg
                          : theme.colors.primaryLight,
                        borderColor: yaSeleccionado
                          ? theme.colors.success
                          : theme.colors.primary,
                      },
                    ]}
                    onPress={() => onAgregar(item)}
                  >
                    <Ionicons
                      name={yaSeleccionado ? 'checkmark' : 'add'}
                      size={20}
                      color={yaSeleccionado ? theme.colors.successText : theme.colors.primary}
                    />
                    {yaSeleccionado && (
                      <Text style={[styles.cantBadge, { color: theme.colors.successText }]}>
                        {cantSeleccionada}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </Card>
            );
          })}

          {catalogoFiltrado.length === 0 && (
            <Card>
              <View style={styles.emptyBox}>
                <Ionicons name="search" size={36} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No se encontraron medicamentos en el catálogo.
                </Text>
              </View>
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  loadingBox: { padding: 24, alignItems: 'center' },
  list: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemInfo: { flex: 1, gap: 4 },
  itemNombre: { fontSize: 15, fontWeight: '700' },
  itemDetalle: { fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 },
  rxBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rxText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantBadge: { fontSize: 10, fontWeight: '800' },
  emptyBox: { padding: 24, alignItems: 'center', gap: 8 },
});
