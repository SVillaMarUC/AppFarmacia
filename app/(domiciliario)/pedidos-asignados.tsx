import { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { PedidoCard } from '@/components/domiciliario/PedidoCard';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import { useLocation } from '@/hooks/useLocation';
import type { Pedido } from '@/types';

export default function PedidosAsignadosScreen() {
  const { perfil } = useAuth();
  const { getCurrentLocation } = useLocation();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoActivoId, setPedidoActivoId] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }
    const unsub = firestoreService.escucharPedidosDomiciliario(perfil.uid, setPedidos);
    return unsub;
  }, [perfil?.uid]);

  useEffect(() => {
    if (!perfil?.uid || !pedidoActivoId) {
      return;
    }

    const interval = setInterval(() => {
      void (async () => {
        try {
          const posicion = await getCurrentLocation();
          await firestoreService.actualizarUbicacionDomiciliario(
            perfil.uid,
            posicion.coords.latitude,
            posicion.coords.longitude,
            pedidoActivoId
          );
        } catch (error) {
          // Silencioso para evitar saturar al usuario por actualizaciones periódicas.
        }
      })();
    }, 30000);

    return () => clearInterval(interval);
  }, [perfil?.uid, pedidoActivoId, getCurrentLocation]);

  const iniciarNavegacion = (pedido: Pedido) => {
    if (!pedido.direccionEntrega) {
      Alert.alert('Sin coordenadas', 'El pedido no tiene dirección georreferenciada.');
      return;
    }
    const { latitud, longitud } = pedido.direccionEntrega;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
    void Linking.openURL(url);
    setPedidoActivoId(pedido.id);
  };

  const confirmarEntrega = async (pedidoId: string) => {
    try {
      await firestoreService.actualizarPedido(pedidoId, { estado: 'entregado' });
      Alert.alert('Entrega confirmada', 'Pedido marcado como entregado.');
      if (pedidoActivoId === pedidoId) {
        setPedidoActivoId(null);
      }
    } catch (error) {
      Alert.alert('Error', 'No fue posible confirmar la entrega.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Entrega y trazabilidad</Text>
          <Text style={styles.titulo}>Pedidos asignados</Text>
          <Text style={styles.info}>La ubicación se reporta cada 30 segundos cuando inicias navegación.</Text>
        </View>
        <Card>
          <FlatList
            data={pedidos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PedidoCard
                pedido={item}
                onIniciarNavegacion={() => iniciarNavegacion(item)}
                onConfirmarEntrega={() => confirmarEntrega(item.id)}
              />
            )}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={<Text style={styles.info}>No tienes pedidos asignados.</Text>}
          />
        </Card>
        <Text style={styles.info}>Confirmación de entrega: botón manual (QR listo para integrar con expo-barcode-scanner).</Text>
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
  info: {
    color: '#334155',
  },
  lista: {
    gap: 10,
    paddingVertical: 6,
  },
});