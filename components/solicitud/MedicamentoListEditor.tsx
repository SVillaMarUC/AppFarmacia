import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import type { Medicamento } from '@/types';

interface MedicamentoListEditorProps {
  medicamentos: Medicamento[];
  onActualizarCantidad: (index: number, delta: number) => void;
  onEliminar: (index: number) => void;
  onAgregarManual: (med: Medicamento) => void;
}

export function MedicamentoListEditor({
  medicamentos,
  onActualizarCantidad,
  onEliminar,
  onAgregarManual,
}: MedicamentoListEditorProps) {
  const { theme } = useTheme();
  const [mostrarManual, setMostrarManual] = useState(false);
  const [nombreManual, setNombreManual] = useState('');
  const [dosisManual, setDosisManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState('1');

  const agregarItem = () => {
    if (!nombreManual.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa el nombre del medicamento.');
      return;
    }

    onAgregarManual({
      nombre: nombreManual.trim(),
      dosis: dosisManual.trim() || undefined,
      cantidad: Math.max(1, parseInt(cantidadManual, 10) || 1),
      requiereReceta: true,
    });

    setNombreManual('');
    setDosisManual('');
    setCantidadManual('1');
    setMostrarManual(false);
  };

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.block}>
          <View style={styles.headerRow}>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>
              Medicamentos en tu Solicitud ({medicamentos.length})
            </Text>
            <Pressable
              style={[styles.addManualBtn, { backgroundColor: theme.colors.primaryLight }]}
              onPress={() => setMostrarManual(!mostrarManual)}
            >
              <Ionicons
                name={mostrarManual ? 'close' : 'add'}
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.addManualText, { color: theme.colors.primary }]}>
                {mostrarManual ? 'Cerrar' : 'Agregar otro'}
              </Text>
            </Pressable>
          </View>

          {mostrarManual && (
            <View
              style={[
                styles.manualForm,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.manualTitle, { color: theme.colors.text }]}>
                Agregar Medicamento Manualmente
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Nombre del medicamento (ej: Losartán 50mg)"
                placeholderTextColor={theme.colors.textSecondary}
                value={nombreManual}
                onChangeText={setNombreManual}
              />
              <View style={styles.manualRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.flexInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Dosis / Posología (opcional)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={dosisManual}
                  onChangeText={setDosisManual}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.cantInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Cant"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={cantidadManual}
                  onChangeText={setCantidadManual}
                  keyboardType="numeric"
                />
              </View>
              <Button texto="Agregar al Pedido" onPress={agregarItem} />
            </View>
          )}

          {medicamentos.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="basket-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                No has agregado medicamentos a tu solicitud.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {medicamentos.map((med, idx) => (
                <View
                  key={`${med.nombre}-${idx}`}
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemNombre, { color: theme.colors.text }]}>
                      {med.nombre}
                    </Text>
                    {med.dosis ? (
                      <Text style={[styles.itemDosis, { color: theme.colors.textSecondary }]}>
                        {med.dosis}
                      </Text>
                    ) : null}
                    {med.requiereReceta && (
                      <Text style={[styles.rxBadge, { color: '#dc2626' }]}>Requiere Receta (Rx)</Text>
                    )}
                  </View>

                  <View style={styles.controlesRow}>
                    <Pressable
                      style={[styles.btnQty, { borderColor: theme.colors.border }]}
                      onPress={() => onActualizarCantidad(idx, -1)}
                    >
                      <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: theme.colors.text }]}>
                      {med.cantidad}
                    </Text>
                    <Pressable
                      style={[styles.btnQty, { borderColor: theme.colors.border }]}
                      onPress={() => onActualizarCantidad(idx, 1)}
                    >
                      <Ionicons name="add" size={16} color={theme.colors.text} />
                    </Pressable>
                    <Pressable
                      style={styles.btnDelete}
                      onPress={() => onEliminar(idx)}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  block: { gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 16, fontWeight: '700' },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addManualText: { fontSize: 12, fontWeight: '700' },
  manualForm: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  manualTitle: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  manualRow: { flexDirection: 'row', gap: 8 },
  flexInput: { flex: 1 },
  cantInput: { width: 70, textAlign: 'center' },
  list: { gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemNombre: { fontSize: 14, fontWeight: '700' },
  itemDosis: { fontSize: 12 },
  rxBadge: { fontSize: 11, fontWeight: '700' },
  controlesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnQty: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  btnDelete: { padding: 6 },
  emptyBox: { padding: 20, alignItems: 'center', gap: 6 },
});
