import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { useTheme } from '@/context/ThemeContext';
import { medicationService } from '@/services/medication.service';
import type { ItemInventario } from '@/types';

type FiltroTipo = 'todos' | 'receta' | 'stock_bajo' | 'vencimiento' | 'inactivos';

type FormInventario = {
  nombre: string;
  principioActivo: string;
  concentracion: string;
  presentacion: string;
  unidad: string;
  requiereReceta: boolean;
  stock: string;
  stockMinimo: string;
  lote: string;
  fechaVencimiento: string;
  activo: boolean;
};

const initialForm: FormInventario = {
  nombre: '',
  principioActivo: '',
  concentracion: '',
  presentacion: '',
  unidad: '',
  requiereReceta: false,
  stock: '0',
  stockMinimo: '5',
  lote: '',
  fechaVencimiento: '',
  activo: true,
};

export default function InventarioScreen() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormInventario>(initialForm);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = medicationService.escucharInventario((data) => {
      setItems(data);
    });
    return unsub;
  }, []);

  const itemsFiltrados = useMemo(() => {
    let filtrados = [...items];
    const q = search.trim().toLowerCase();

    if (q) {
      filtrados = filtrados.filter(
        (it) =>
          it.nombre.toLowerCase().includes(q) ||
          (it.principioActivo && it.principioActivo.toLowerCase().includes(q)) ||
          (it.lote && it.lote.toLowerCase().includes(q))
      );
    }

    if (filtro === 'receta') {
      filtrados = filtrados.filter((it) => it.requiereReceta);
    } else if (filtro === 'stock_bajo') {
      filtrados = filtrados.filter((it) => it.stock <= it.stockMinimo);
    } else if (filtro === 'vencimiento') {
      filtrados = filtrados.filter((it) => {
        const ev = medicationService.evaluarVencimiento(it.fechaVencimiento);
        return ev.estado === 'proximo_a_vencer' || ev.estado === 'vencido';
      });
    } else if (filtro === 'inactivos') {
      filtrados = filtrados.filter((it) => !it.activo);
    }

    return filtrados;
  }, [items, search, filtro]);

  const abrirAgregar = () => {
    setEditandoId(null);
    setForm(initialForm);
    setModalVisible(true);
  };

  const abrirEditar = (item: ItemInventario) => {
    setEditandoId(item.id);
    let fechaStr = '';
    if (item.fechaVencimiento) {
      if (typeof item.fechaVencimiento === 'string') {
        fechaStr = item.fechaVencimiento;
      } else if (item.fechaVencimiento instanceof Date) {
        fechaStr = item.fechaVencimiento.toISOString().slice(0, 10);
      } else if (typeof item.fechaVencimiento === 'object' && 'toDate' in item.fechaVencimiento) {
        fechaStr = (item.fechaVencimiento as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
      }
    }

    setForm({
      nombre: item.nombre,
      principioActivo: item.principioActivo ?? '',
      concentracion: item.concentracion ?? '',
      presentacion: item.presentacion ?? '',
      unidad: item.unidad ?? '',
      requiereReceta: Boolean(item.requiereReceta),
      stock: String(item.stock),
      stockMinimo: String(item.stockMinimo),
      lote: item.lote ?? '',
      fechaVencimiento: fechaStr,
      activo: item.activo !== false,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Campo obligatorio', 'El nombre del medicamento es requerido.');
      return;
    }

    const stockNum = Math.max(0, parseInt(form.stock.replace(/\D/g, '') || '0', 10));
    const stockMinNum = Math.max(0, parseInt(form.stockMinimo.replace(/\D/g, '') || '0', 10));

    try {
      setGuardando(true);
      const payload: Partial<ItemInventario> = {
        nombre: form.nombre.trim(),
        principioActivo: form.principioActivo.trim() || undefined,
        concentracion: form.concentracion.trim() || undefined,
        presentacion: form.presentacion.trim() || undefined,
        unidad: form.unidad.trim() || undefined,
        requiereReceta: form.requiereReceta,
        stock: stockNum,
        stockMinimo: stockMinNum,
        lote: form.lote.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento.trim() || null,
        activo: form.activo,
      };

      if (editandoId) {
        await medicationService.actualizarMedicamento(editandoId, payload);
        Alert.alert('Actualizado', 'Medicamento actualizado correctamente.');
      } else {
        await medicationService.crearMedicamento(payload as Omit<ItemInventario, 'id'>);
        Alert.alert('Creado', 'Medicamento registrado exitosamente.');
      }
      setModalVisible(false);
      setForm(initialForm);
    } catch (error) {
      Alert.alert('Error', 'No fue posible guardar el medicamento.');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (item: ItemInventario) => {
    try {
      await medicationService.toggleActivo(item.id, item.activo);
    } catch (error) {
      Alert.alert('Error', 'No fue posible cambiar el estado del medicamento.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Módulo Despachador"
          title="Inventario de Medicamentos"
          subtitle="Administra el catálogo, stock, lotes, fechas de vencimiento y requerimiento de receta."
        />

        <View style={styles.topActions}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.inputBg,
                borderColor: theme.colors.inputBorder,
                color: theme.colors.inputText,
              },
            ]}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, principio activo o lote..."
            placeholderTextColor={theme.colors.inputPlaceholder}
          />
          <Button texto="+ Nuevo" onPress={abrirAgregar} />
        </View>

        {/* Filtros rápidos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
          {[
            { id: 'todos', label: `Todos (${items.length})` },
            { id: 'receta', label: 'Con Receta' },
            { id: 'stock_bajo', label: 'Stock Bajo' },
            { id: 'vencimiento', label: 'Vencimiento Próximo' },
            { id: 'inactivos', label: 'Inactivos' },
          ].map((f) => {
            const activo = filtro === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filtroChip,
                  {
                    backgroundColor: activo ? theme.colors.primary : theme.colors.surfaceSecondary,
                    borderColor: activo ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFiltro(f.id as FiltroTipo)}
              >
                <Text
                  style={[
                    styles.filtroChipText,
                    { color: activo ? '#ffffff' : theme.colors.textSecondary },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <FlatList
          data={itemsFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const venc = medicationService.evaluarVencimiento(item.fechaVencimiento);
            return (
              <Card>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tituloRow}>
                      <Text style={[styles.itemTitulo, { color: theme.colors.text }]}>
                        {item.nombre}
                      </Text>
                      {!item.activo ? (
                        <View style={[styles.inactivoBadge, { backgroundColor: theme.colors.border }]}>
                          <Text style={[styles.inactivoText, { color: theme.colors.textMuted }]}>
                            Inactivo
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {item.principioActivo || item.concentracion ? (
                      <Text style={[styles.itemSub, { color: theme.colors.textSecondary }]}>
                        {[item.principioActivo, item.concentracion, item.presentacion]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity onPress={() => abrirEditar(item)} style={styles.btnEditar}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Metadata & Badges */}
                <View style={styles.badgesWrap}>
                  <StockIndicator stock={item.stock} stockMinimo={item.stockMinimo} />

                  {item.requiereReceta ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: theme.colors.errorBg, borderColor: theme.colors.error },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: theme.colors.errorText }]}>
                        Requiere Receta
                      </Text>
                    </View>
                  ) : null}

                  {venc.estado !== 'sin_fecha' ? (
                    <StockIndicator
                      stock={item.stock}
                      stockMinimo={item.stockMinimo}
                      tipo="vencimiento"
                      vencimientoEstado={venc.estado}
                      diasRestantes={venc.diasRestantes}
                    />
                  ) : null}
                </View>

                {/* Detalles técnicos */}
                <View style={[styles.itemFooter, { borderTopColor: theme.colors.borderLight }]}>
                  <Text style={[styles.itemDetalle, { color: theme.colors.textSecondary }]}>
                    Stock: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{item.stock}</Text> (Mín: {item.stockMinimo})
                  </Text>
                  {item.lote ? (
                    <Text style={[styles.itemDetalle, { color: theme.colors.textSecondary }]}>
                      Lote: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{item.lote}</Text>
                    </Text>
                  ) : null}
                  <TouchableOpacity onPress={() => alternarActivo(item)}>
                    <Text
                      style={[
                        styles.toggleActivoText,
                        { color: item.activo ? theme.colors.error : theme.colors.primary },
                      ]}
                    >
                      {item.activo ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <Card>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No se encontraron medicamentos en inventario.
              </Text>
            </Card>
          }
        />

        {/* MODAL CREAR / EDITAR */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {editandoId ? 'Editar Medicamento' : 'Nuevo Medicamento'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalForm}>
                <Input
                  label="Nombre Comercial *"
                  value={form.nombre}
                  onChangeText={(v) => setForm({ ...form, nombre: v })}
                  placeholder="Ej: Dolex Forte"
                />

                <Input
                  label="Principio Activo"
                  value={form.principioActivo}
                  onChangeText={(v) => setForm({ ...form, principioActivo: v })}
                  placeholder="Ej: Acetaminofén"
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Concentración"
                      value={form.concentracion}
                      onChangeText={(v) => setForm({ ...form, concentracion: v })}
                      placeholder="Ej: 500mg"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Presentación"
                      value={form.presentacion}
                      onChangeText={(v) => setForm({ ...form, presentacion: v })}
                      placeholder="Ej: Tabletas"
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Stock Actual *"
                      value={form.stock}
                      keyboardType="numeric"
                      onChangeText={(v) => setForm({ ...form, stock: v })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Stock Mínimo"
                      value={form.stockMinimo}
                      keyboardType="numeric"
                      onChangeText={(v) => setForm({ ...form, stockMinimo: v })}
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Lote"
                      value={form.lote}
                      onChangeText={(v) => setForm({ ...form, lote: v })}
                      placeholder="Ej: LOT-2026A"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Vencimiento (AAAA-MM-DD)"
                      value={form.fechaVencimiento}
                      onChangeText={(v) => setForm({ ...form, fechaVencimiento: v })}
                      placeholder="2027-12-31"
                    />
                  </View>
                </View>

                {/* Switch Requiere Receta */}
                <View style={[styles.switchRow, { borderColor: theme.colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: theme.colors.text }]}>
                      ¿Requiere Receta Médica?
                    </Text>
                    <Text style={[styles.switchSub, { color: theme.colors.textSecondary }]}>
                      Exige al afiliado cargar foto de fórmula médica
                    </Text>
                  </View>
                  <Switch
                    value={form.requiereReceta}
                    onValueChange={(val) => setForm({ ...form, requiereReceta: val })}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  />
                </View>

                {/* Switch Activo */}
                <View style={[styles.switchRow, { borderColor: theme.colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: theme.colors.text }]}>
                      Medicamento Activo
                    </Text>
                    <Text style={[styles.switchSub, { color: theme.colors.textSecondary }]}>
                      Visible para búsqueda y pedidos de afiliados
                    </Text>
                  </View>
                  <Switch
                    value={form.activo}
                    onValueChange={(val) => setForm({ ...form, activo: val })}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  />
                </View>

                <View style={styles.modalBotones}>
                  <Button texto="Guardar Medicamento" onPress={guardar} loading={guardando} />
                  <Button texto="Cancelar" onPress={() => setModalVisible(false)} variant="secundario" />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  filtrosRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filtroChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitulo: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  btnEditar: {
    padding: 4,
  },
  inactivoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactivoText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  itemDetalle: {
    fontSize: 12,
  },
  toggleActivoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalForm: {
    padding: 16,
    gap: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 11,
  },
  modalBotones: {
    gap: 8,
    marginTop: 8,
  },
});
