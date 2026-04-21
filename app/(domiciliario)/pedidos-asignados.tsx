import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, doc, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import type { Pedido } from '@/types';

export default function PedidosAsignadosScreen() {
  const { perfil } = useAuth();
  const [disponible, setDisponible] = useState<boolean>(true);
  const [actualizandoDisponibilidad, setActualizandoDisponibilidad] = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [pedidosAsignados, setPedidosAsignados] = useState<Pedido[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }

    const usuarioRef = doc(db, 'usuarios', perfil.uid);
    const unsubUsuario = onSnapshot(usuarioRef, (snapshot) => {
      const data = snapshot.data();
      setDisponible(Boolean(data?.disponible));
    });

    const qActivo = query(
      collection(db, 'pedidos'),
      where('domiciliarioId', '==', perfil.uid),
      where('estado', '==', 'en_camino'),
      limit(1)
    );

    const qPendientes = query(
      collection(db, 'pedidos'),
      where('domiciliarioId', '==', perfil.uid),
      where('estado', '==', 'asignado')
    );

    const unsubActivo = onSnapshot(qActivo, (snapshot) => {
      const docItem = snapshot.docs[0];
      setPedidoActivo(docItem ? ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) } as Pedido) : null);
    });

    const unsubPendientes = onSnapshot(qPendientes, (snapshot) => {
      setPedidosAsignados(snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) } as Pedido)));
    });

    return () => {
      unsubUsuario();
      unsubActivo();
      unsubPendientes();
    };
  }, [perfil?.uid]);

  const toggleDisponibilidad = async () => {
    if (!perfil?.uid) {
      return;
    }
    try {
      setActualizandoDisponibilidad(true);
      const nuevoEstado = !disponible;
      await updateDoc(doc(db, 'usuarios', perfil.uid), { disponible: nuevoEstado });
      setDisponible(nuevoEstado);
    } catch (error) {
      Alert.alert('Error', 'No fue posible actualizar tu disponibilidad.');
    } finally {
      setActualizandoDisponibilidad(false);
    }
  };

  const marcarEntregado = async () => {
    if (!pedidoActivo?.id) {
      return;
    }

    Alert.alert('Confirmar entrega', '¿Deseas marcar este pedido como entregado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'pedidos', pedidoActivo.id), { estado: 'entregado' });
            Alert.alert('Éxito', 'Pedido marcado como entregado.');
          } catch (error) {
            Alert.alert('Error', 'No fue posible actualizar el pedido.');
          }
        },
      },
    ]);
  };

  const tiempoEsperando = (pedido: Pedido) => {
    const raw = pedido.timestampCreacion;
    if (!raw || typeof raw !== 'object' || !('toDate' in raw)) {
      return 'Sin fecha';
    }
    const min = Math.max(1, Math.round((Date.now() - raw.toDate().getTime()) / 60000));
    if (min < 60) return `${min} min`;
    return `${Math.round(min / 60)} h`;
  };

  const totalActivos = useMemo(
    () => [pedidoActivo, ...pedidosAsignados].filter((item): item is Pedido => Boolean(item)).length,
    [pedidoActivo, pedidosAsignados]
  );

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.estadoRow}>
            <Text style={styles.estadoLabel}>Estado:</Text>
            <Pressable onPress={toggleDisponibilidad} style={[styles.estadoPill, disponible ? styles.disponiblePill : styles.noDisponiblePill]}>
              {actualizandoDisponibilidad ? (
                <ActivityIndicator color="#0f766e" size="small" />
              ) : (
                <Text style={[styles.estadoTexto, disponible ? styles.disponibleTexto : styles.noDisponibleTexto]}>
                  {disponible ? 'Disponible' : 'No disponible'}
                </Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.info}>Pedidos activos: {totalActivos}</Text>
        </Card>

        {pedidoActivo ? (
          <Card>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entrega activa</Text>
              <Text style={styles.info}>Paciente: {pedidoActivo.usuarioId}</Text>
              <Text style={styles.info}>Dirección: {pedidoActivo.direccionEntrega?.direccion ?? 'Sin dirección'}</Text>
              <Text style={styles.info}>Medicamentos: {pedidoActivo.medicamentos.map((m) => m.nombre).join(', ')}</Text>
              <Button texto="Marcar como entregado" onPress={marcarEntregado} />
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pedidos asignados</Text>
            {!pedidosAsignados.length ? <Text style={styles.info}>No tienes pedidos asignados en este momento.</Text> : null}
            {pedidosAsignados.map((pedido) => {
              const expandido = expandidoId === pedido.id;
              return (
                <Pressable
                  key={pedido.id}
                  style={styles.rowPedido}
                  onPress={() => setExpandidoId((prev) => (prev === pedido.id ? null : pedido.id))}
                >
                  <Text style={styles.rowMain}>{pedido.direccionEntrega?.direccion ?? 'Sin dirección'}</Text>
                  <Text style={styles.info}>Medicamentos: {pedido.medicamentos.map((m) => m.nombre).join(', ')}</Text>
                  <Text style={styles.info}>Tiempo esperando: {tiempoEsperando(pedido)}</Text>
                  {expandido ? (
                    <View style={styles.detalleExpandido}>
                      <Text style={styles.info}>Modo de entrega: {pedido.modoEntrega}</Text>
                      <Text style={styles.info}>Estado: {pedido.estado}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  estadoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  estadoLabel: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  estadoPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 122,
    alignItems: 'center',
  },
  disponiblePill: { backgroundColor: '#f0fdfa' },
  noDisponiblePill: { backgroundColor: '#f8fafc' },
  estadoTexto: { fontWeight: '700', fontSize: 14 },
  disponibleTexto: { color: '#0f766e' },
  noDisponibleTexto: { color: '#64748b' },
  section: { gap: 8 },
  sectionTitle: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  info: { color: '#334155', fontSize: 14, lineHeight: 20 },
  rowPedido: { borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 12, padding: 10, gap: 4 },
  rowMain: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  detalleExpandido: { marginTop: 4, borderTopWidth: 1, borderTopColor: '#dbe4ee', paddingTop: 6, gap: 2 },
});
