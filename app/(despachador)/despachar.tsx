import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Pedido } from '@/types';

export default function DespacharScreen() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      setPedidos(snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) })));
    });
    return unsub;
  }, []);

  const cambiarEstado = async (pedidoId: string, estado: Pedido['estado']) => {
    try {
      await firestoreService.actualizarPedido(pedidoId, { estado });
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar estado de pedido.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Operación de despacho</Text>
          <Text style={styles.titulo}>Gestión de despacho</Text>
          <Text style={styles.subtitulo}>Marca estados con una vista más clara y ordenada para el equipo.</Text>
        </View>
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.item}>
                <Text style={styles.codigo}>Pedido {item.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.texto}>Estado actual: {item.estado.replace('_', ' ')}</Text>
                <Button texto="Marcar en preparación" onPress={() => cambiarEstado(item.id, 'en_preparacion')} />
                <Button texto="Marcar listo" onPress={() => cambiarEstado(item.id, 'listo')} variant="secundario" />
              </View>
            </Card>
          )}
          ListEmptyComponent={<Card><Text style={styles.texto}>No hay pedidos para despachar.</Text></Card>}
        />
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
  lista: {
    gap: 12,
    paddingBottom: 12,
  },
  item: {
    gap: 8,
  },
  codigo: {
    fontWeight: '700',
    color: '#0f172a',
  },
  texto: {
    color: '#334155',
  },
});