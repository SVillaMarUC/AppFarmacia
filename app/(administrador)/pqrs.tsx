import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/services/firebase/config';

type PqrsItem = {
  id: string;
  mensaje: string;
  estado: string;
};

export default function PqrsScreen() {
  const [pqrs, setPqrs] = useState<PqrsItem[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pqrs'), (snapshot) => {
      setPqrs(
        snapshot.docs.map((docItem) => ({
          id: docItem.id,
          mensaje: String(docItem.data().mensaje ?? 'Sin mensaje'),
          estado: String(docItem.data().estado ?? 'abierta'),
        }))
      );
    });
    return unsub;
  }, []);

  const responder = async (id: string) => {
    try {
      await updateDoc(doc(db, 'pqrs', id), { estado: 'respondida' });
    } catch (error) {
      Alert.alert('Error', 'No fue posible responder PQRS.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Gestión de soporte</Text>
          <Text style={styles.titulo}>PQRS</Text>
          <Text style={styles.subtitulo}>Revisa mensajes y responde con una vista más ordenada y confiable.</Text>
        </View>
        <FlatList
          data={pqrs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.item}>
                <Text style={styles.mensaje}>{item.mensaje}</Text>
                <Text style={styles.estado}>Estado: {item.estado}</Text>
                {item.estado !== 'respondida' ? <Button texto="Marcar respondida" onPress={() => responder(item.id)} /> : null}
              </View>
            </Card>
          )}
          ListEmptyComponent={<Card><Text style={styles.empty}>No hay PQRS registradas.</Text></Card>}
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
  listContent: {
    gap: 12,
    paddingBottom: 12,
  },
  item: {
    gap: 8,
  },
  mensaje: {
    color: '#0f172a',
    fontWeight: '600',
  },
  estado: {
    color: '#334155',
    fontWeight: '600',
  },
  empty: {
    color: '#334155',
  },
});