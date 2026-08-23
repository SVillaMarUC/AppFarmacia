import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/services/firebase/config';

type InventarioItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad?: string;
  descripcion?: string;
};

type FormInventario = {
  nombre: string;
  cantidad: string;
  unidad: string;
  descripcion: string;
};

const initialForm: FormInventario = {
  nombre: '',
  cantidad: '',
  unidad: '',
  descripcion: '',
};

export default function InventarioScreen() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormInventario>(initialForm);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'inventario'),
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              nombre: String(data.nombre ?? ''),
              cantidad: Number(data.cantidad ?? data.stock ?? 0),
              unidad: data.unidad ? String(data.unidad) : '',
              descripcion: data.descripcion ? String(data.descripcion) : '',
            };
          })
        );
      },
      () => Alert.alert('Error', 'No fue posible cargar inventario.')
    );

    return unsub;
  }, []);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.nombre.toLowerCase().includes(q));
  }, [items, search]);

  const abrirAgregar = () => {
    setEditandoId(null);
    setForm(initialForm);
    setModalVisible(true);
  };

  const abrirEditar = (item: InventarioItem) => {
    setEditandoId(item.id);
    setForm({
      nombre: item.nombre,
      cantidad: String(item.cantidad),
      unidad: item.unidad ?? '',
      descripcion: item.descripcion ?? '',
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.cantidad.trim()) {
      Alert.alert('Datos requeridos', 'Nombre y cantidad son obligatorios.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      cantidad: Number(form.cantidad.replace(/\D/g, '') || '0'),
      unidad: form.unidad.trim(),
      descripcion: form.descripcion.trim(),
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'inventario', editandoId), payload);
      } else {
        await addDoc(collection(db, 'inventario'), payload);
      }
      setModalVisible(false);
      setForm(initialForm);
    } catch (error) {
      Alert.alert('Error', 'No fue posible guardar el ítem.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Módulo Despachador"
          title="Inventario de Farmacia"
          subtitle="Consulta, filtra y gestiona el stock de medicamentos de la sede en tiempo real."
        />

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
          placeholder="Buscar medicamento por nombre..."
          placeholderTextColor={theme.colors.inputPlaceholder}
        />

        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable onPress={() => abrirEditar(item)}>
              <Card>
                <View style={styles.itemRow}>
                  <View>
                    <Text style={[styles.itemNombre, { color: theme.colors.text }]}>{item.nombre}</Text>
                    <Text style={[styles.itemDetalle, { color: theme.colors.textSecondary }]}>
                      {item.cantidad} {item.unidad || ''}
                    </Text>
                  </View>
                  {item.cantidad < 10 ? (
                    <Text
                      style={[
                        styles.stockBajo,
                        {
                          color: theme.colors.errorText,
                          borderColor: theme.colors.error,
                          backgroundColor: theme.colors.errorBg,
                        },
                      ]}
                    >
                      Stock bajo
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.itemDetalle, { color: theme.colors.textSecondary }]}>Sin resultados.</Text>
          }
        />

        <Pressable
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={abrirAgregar}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editandoId ? 'Editar ítem' : 'Nuevo ítem'}
            </Text>
            <TextInput
              style={[
                styles.field,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.inputText,
                },
              ]}
              value={form.nombre}
              onChangeText={(v) => setForm((prev) => ({ ...prev, nombre: v }))}
              placeholder="Nombre"
              placeholderTextColor={theme.colors.inputPlaceholder}
            />
            <TextInput
              style={[
                styles.field,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.inputText,
                },
              ]}
              value={form.cantidad}
              onChangeText={(v) => setForm((prev) => ({ ...prev, cantidad: v }))}
              placeholder="Cantidad"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.inputPlaceholder}
            />
            <TextInput
              style={[
                styles.field,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.inputText,
                },
              ]}
              value={form.unidad}
              onChangeText={(v) => setForm((prev) => ({ ...prev, unidad: v }))}
              placeholder="Unidad (opcional)"
              placeholderTextColor={theme.colors.inputPlaceholder}
            />
            <TextInput
              style={[
                styles.field,
                styles.fieldArea,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.inputText,
                },
              ]}
              value={form.descripcion}
              onChangeText={(v) => setForm((prev) => ({ ...prev, descripcion: v }))}
              placeholder="Descripción (opcional)"
              multiline
              placeholderTextColor={theme.colors.inputPlaceholder}
            />
            <Button texto="Guardar" onPress={guardar} />
            <Button texto="Cancelar" onPress={() => setModalVisible(false)} variant="secundario" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  listContent: { gap: 10, paddingBottom: 110 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { fontWeight: '700', fontSize: 14 },
  itemDetalle: { fontSize: 14, lineHeight: 20 },
  stockBajo: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontWeight: '700',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginTop: -2 },
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
    gap: 10,
  },
  modalTitle: { fontWeight: '800', fontSize: 18 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldArea: { minHeight: 80, textAlignVertical: 'top' },
});

