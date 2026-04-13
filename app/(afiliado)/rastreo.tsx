import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

type Coordenada = { latitude: number; longitude: number };

const haversineMetros = (a: Coordenada, b: Coordenada): number => {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
};

export default function RastreoScreen() {
  const { perfil } = useAuth();
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [domiciliarioPos, setDomiciliarioPos] = useState<Coordenada | null>(null);
  const [alertaEnviada, setAlertaEnviada] = useState(false);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }
    const unsubPedido = firestoreService.escucharPedidoActivo(perfil.uid, setPedidoActivo);
    return unsubPedido;
  }, [perfil?.uid]);

  useEffect(() => {
    if (!pedidoActivo?.domiciliarioId) {
      return;
    }
    const unsub = onSnapshot(doc(db, 'ubicacionesDomiciliarios', pedidoActivo.domiciliarioId), (snapshot) => {
      const data = snapshot.data() as { latitud: number; longitud: number } | undefined;
      if (!data) {
        return;
      }
      setDomiciliarioPos({ latitude: data.latitud, longitude: data.longitud });
    });
    return unsub;
  }, [pedidoActivo?.domiciliarioId]);

  const destino = useMemo<Coordenada | null>(() => {
    if (!pedidoActivo?.direccionEntrega) {
      return null;
    }
    return {
      latitude: pedidoActivo.direccionEntrega.latitud,
      longitude: pedidoActivo.direccionEntrega.longitud,
    };
  }, [pedidoActivo?.direccionEntrega]);

  const distancia = useMemo(() => {
    if (!domiciliarioPos || !destino) {
      return null;
    }
    return haversineMetros(domiciliarioPos, destino);
  }, [domiciliarioPos, destino]);

  useEffect(() => {
    if (distancia !== null && distancia < 500 && !alertaEnviada) {
      Alert.alert('Domiciliario cercano', 'Tu pedido está a menos de 500 metros.');
      setAlertaEnviada(true);
    }
  }, [distancia, alertaEnviada]);

  const etaMin = distancia !== null ? Math.max(1, Math.round((distancia / 1000 / 20) * 60)) : null;

  if (!pedidoActivo || !destino) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.info}>No hay pedido en camino para rastrear.</Text>
        </View>
      </Screen>
    );
  }

  const region = {
    latitude: destino.latitude,
    longitude: destino.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Rastreo activo</Text>
          <Text style={styles.titulo}>Rastreo en tiempo real</Text>
          <Text style={styles.info}>Actualización esperada cada 30 segundos.</Text>
        </View>
        <Card>
          <MapView style={styles.map} initialRegion={region}>
            <Marker coordinate={destino} title="Destino" description="Dirección de entrega" />
            {domiciliarioPos ? <Marker coordinate={domiciliarioPos} pinColor="#0ea5e9" title="Domiciliario" /> : null}
          </MapView>
        </Card>
        <Card>
          <View style={styles.panel}>
            <Text style={styles.info}>Distancia estimada: {distancia ? `${Math.round(distancia)} m` : 'Sin señal de ubicación'}</Text>
            <Text style={styles.info}>Tiempo estimado de llegada: {etaMin ? `${etaMin} min` : 'Calculando...'}</Text>
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
  map: {
    width: '100%',
    height: 320,
    borderRadius: 16,
  },
  panel: {
    gap: 6,
  },
  info: {
    color: '#334155',
    lineHeight: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
