import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/services/firebase/config';

export default function DashboardAdminScreen() {
  const [pedidos, setPedidos] = useState(0);
  const [pqrs, setPqrs] = useState(0);

  useEffect(() => {
    const unsubPedidos = onSnapshot(collection(db, 'pedidos'), (snapshot) => setPedidos(snapshot.size));
    const unsubPqrs = onSnapshot(collection(db, 'pqrs'), (snapshot) => setPqrs(snapshot.size));
    return () => {
      unsubPedidos();
      unsubPqrs();
    };
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Centro de control</Text>
          <Text style={styles.titulo}>Panel Administrador EPS</Text>
          <Text style={styles.subtitulo}>Métricas simples y limpias para supervisar pedidos y PQRS sin perder contexto.</Text>
        </View>
        <View style={styles.grid}>
          <Card>
            <Text style={styles.label}>Pedidos totales</Text>
            <Text style={styles.valor}>{pedidos}</Text>
          </Card>
          <Card>
            <Text style={styles.label}>PQRS abiertas</Text>
            <Text style={styles.valor}>{pqrs}</Text>
          </Card>
        </View>
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
  grid: {
    gap: 12,
  },
  label: {
    color: '#334155',
    fontWeight: '600',
  },
  valor: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f766e',
    marginTop: 4,
  },
});