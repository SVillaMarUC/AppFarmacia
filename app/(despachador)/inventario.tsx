import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { firestoreService } from '@/services/firebase/firestore.service';
import { storageService } from '@/services/firebase/storage.service';
import type { ItemInventario } from '@/types';

export default function InventarioScreen() {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [nombre, setNombre] = useState('');
  const [lote, setLote] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [fotoAjusteUri, setFotoAjusteUri] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const data = await firestoreService.obtenerInventario();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar inventario.');
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const seleccionarFoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled) {
        setFotoAjusteUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo adjuntar foto.');
    }
  };

  const agregarStock = async () => {
    try {
      const id = `${nombre.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`;
      const fotoAjusteUrl = fotoAjusteUri ? await storageService.subirFotoAjuste(fotoAjusteUri, id) : undefined;

      await firestoreService.guardarInventario({
        id,
        nombre,
        categoria: 'General',
        stock: Number(cantidad),
        stockMinimo: 20,
        lote,
        fechaVencimiento: new Date(vencimiento),
        proveedor: 'Proveedor EPS',
        motivoAjuste,
        fotoAjusteUrl,
      });

      Alert.alert('Inventario actualizado', 'Entrada registrada correctamente.');
      setNombre('');
      setLote('');
      setCantidad('');
      setVencimiento('');
      setMotivoAjuste('');
      setFotoAjusteUri(null);
      void cargar();
    } catch (error) {
      Alert.alert('Error', 'No fue posible registrar el stock.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Operación y abastecimiento</Text>
          <Text style={styles.titulo}>Inventario de medicamentos</Text>
          <Text style={styles.subtitulo}>Supervisa stock y registra movimientos con una vista más limpia y ordenada.</Text>
        </View>

        <Card>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={styles.lista}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.item}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <StockIndicator stock={item.stock} stockMinimo={item.stockMinimo} />
                  </View>
                  <Text style={styles.detalle}>Stock: {item.stock}</Text>
                  <Text style={styles.detalle}>Lote: {item.lote}</Text>
                </View>
              </Card>
            )}
            ListEmptyComponent={<Text style={styles.detalle}>No hay ítems de inventario.</Text>}
          />
        </Card>

        <Card>
          <View style={styles.form}>
            <Text style={styles.subtituloSeccion}>Agregar/ajustar stock</Text>
            <Input label="Medicamento" value={nombre} onChangeText={setNombre} />
            <Input label="Lote" value={lote} onChangeText={setLote} />
            <Input label="Cantidad" value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />
            <Input label="Vencimiento (YYYY-MM-DD)" value={vencimiento} onChangeText={setVencimiento} />
            <Input label="Motivo ajuste" value={motivoAjuste} onChangeText={setMotivoAjuste} />
            <Button texto="Adjuntar foto (opcional)" onPress={seleccionarFoto} variant="secundario" />
            <Button texto="Guardar movimiento" onPress={agregarStock} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  hero: {
    gap: 6,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  subtitulo: {
    color: '#334155',
    lineHeight: 20,
  },
  subtituloSeccion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  lista: {
    maxHeight: 280,
  },
  item: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nombre: {
    color: '#0f172a',
    fontWeight: '700',
  },
  detalle: {
    color: '#334155',
  },
  form: {
    gap: 12,
  },
});