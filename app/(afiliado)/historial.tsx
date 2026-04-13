import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

export default function HistorialScreen() {
  const { perfil } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }
    const q = query(collection(db, 'pedidos'), where('usuarioId', '==', perfil.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setPedidos(snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) })));
    });
    return unsub;
  }, [perfil?.uid]);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Seguimiento histórico</Text>
          <Text style={styles.titulo}>Historial de pedidos</Text>
          <Text style={styles.subtitulo}>Consulta el registro de tus solicitudes y revisa su estado con un formato más limpio.</Text>
        </View>
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.item}>
                <Text style={styles.codigo}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.texto}>Estado: {item.estado.replace('_', ' ')}</Text>
                <Text style={styles.texto}>Medicamentos: {item.medicamentos.length}</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={<Card><Text style={styles.texto}>Aún no tienes pedidos registrados.</Text></Card>}
          contentContainerStyle={styles.lista}
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
    gap: 6,
  },
  codigo: {
    fontWeight: '700',
    color: '#0f172a',
  },
  texto: {
    color: '#334155',
  },
});