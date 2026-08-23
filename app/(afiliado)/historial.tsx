import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

export default function HistorialScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();
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
        <ScreenHeader
          kicker="Seguimiento histórico"
          title="Historial de pedidos"
          subtitle="Consulta el registro de tus solicitudes y revisa su estado con un formato más limpio."
        />
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.item}>
                <Text style={[styles.codigo, { color: theme.colors.text }]}>
                  #{item.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Estado: {item.estado.replace('_', ' ')}
                </Text>
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Medicamentos: {item.medicamentos.length}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Card>
              <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                Aún no tienes pedidos registrados.
              </Text>
            </Card>
          }
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
  lista: {
    gap: 12,
    paddingBottom: 12,
  },
  item: {
    gap: 6,
  },
  codigo: {
    fontWeight: '700',
  },
  texto: {
    fontSize: 14,
  },
});