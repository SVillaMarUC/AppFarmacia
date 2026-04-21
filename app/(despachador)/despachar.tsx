import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/services/firebase/config';
import type { Pedido, Usuario } from '@/types';

type DomiciliarioDisponible = Pick<Usuario, 'uid' | 'nombre' | 'cedula'> & { pedidosActivos: number };

export default function DespacharScreen() {
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [domiciliariosRaw, setDomiciliariosRaw] = useState<Array<Pick<Usuario, 'uid' | 'nombre' | 'cedula'>>>([]);
  const [seleccionadoUid, setSeleccionadoUid] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const qPendientes = query(collection(db, 'pedidos'), where('estado', '==', 'pendiente'), orderBy('timestampCreacion', 'asc'));

    const unsubPedidos = onSnapshot(
      qPendientes,
      (snapshot) => {
        setPedidosPendientes(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) } as Pedido)));
      },
      () => Alert.alert('Error', 'No fue posible cargar pedidos pendientes.')
    );

    const qDomiciliarios = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'domiciliario'),
      where('disponible', '==', true)
    );

    const unsubDomiciliarios = onSnapshot(
      qDomiciliarios,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ uid: d.id, ...(d.data() as Usuario) }));
        setDomiciliariosRaw(
          data.map((item) => ({
            uid: item.uid,
            nombre: item.nombre,
            cedula: item.cedula,
          }))
        );
      },
      () => Alert.alert('Error', 'No fue posible cargar domiciliarios disponibles.')
    );

    return () => {
      unsubPedidos();
      unsubDomiciliarios();
    };
  }, []);

  const domiciliarios: DomiciliarioDisponible[] = useMemo(
    () =>
      domiciliariosRaw.map((item) => ({
        ...item,
        pedidosActivos: pedidosPendientes.filter(
          (p) => p.domiciliarioId === item.uid && (p.estado === 'asignado' || p.estado === 'en_camino')
        ).length,
      })),
    [domiciliariosRaw, pedidosPendientes]
  );

  const abrirAsignacion = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    setSeleccionadoUid('');
    setModalVisible(true);
  };

  const confirmarAsignacion = async () => {
    if (!pedidoSeleccionado?.id || !seleccionadoUid) {
      return;
    }

    try {
      setGuardando(true);
      await updateDoc(doc(db, 'pedidos', pedidoSeleccionado.id), {
        estado: 'asignado',
        domiciliarioId: seleccionadoUid,
        asignadoEn: serverTimestamp(),
      });
      setModalVisible(false);
      Alert.alert('Éxito', 'Pedido asignado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No fue posible asignar el pedido.');
    } finally {
      setGuardando(false);
    }
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

  const resumenPedido = useMemo(() => {
    if (!pedidoSeleccionado) {
      return '';
    }
    const meds = pedidoSeleccionado.medicamentos.map((m) => `${m.nombre} (${m.cantidad})`).join(', ');
    return `${meds} · ${pedidoSeleccionado.modoEntrega}`;
  }, [pedidoSeleccionado]);

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pedidos pendientes</Text>
            {!pedidosPendientes.length ? <Text style={styles.text}>No hay pedidos pendientes.</Text> : null}

            {pedidosPendientes.map((pedido) => (
              <View key={pedido.id} style={styles.rowPedido}>
                <View style={styles.rowTop}>
                  <Text style={styles.textStrong}>Hace {tiempoEsperando(pedido)}</Text>
                  <Text style={styles.chipEntrega}>{pedido.modoEntrega === 'domicilio' ? 'A domicilio' : 'Recogida'}</Text>
                </View>
                <Text style={styles.text}>Medicamentos: {pedido.medicamentos.map((m) => m.nombre).join(', ')}</Text>
                <View style={styles.actionWrap}>
                  <Pressable style={styles.btnAsignar} onPress={() => abrirAsignacion(pedido)}>
                    <Text style={styles.btnAsignarText}>Asignar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Asignar pedido</Text>
            <Text style={styles.text}>{resumenPedido || 'Sin resumen'}</Text>

            <View style={styles.listDomWrap}>
              {domiciliarios.map((domi) => (
                <Pressable
                  key={domi.uid}
                  style={[styles.rowDomi, seleccionadoUid === domi.uid && styles.rowDomiSelected]}
                  onPress={() => setSeleccionadoUid(domi.uid)}
                >
                  <Text style={styles.textStrong}>{domi.nombre}</Text>
                  <Text style={styles.text}>Cédula: {domi.cedula}</Text>
                  <Text style={styles.text}>{domi.pedidosActivos} pedidos activos</Text>
                </Pressable>
              ))}
            </View>

            <Button texto="Confirmar asignación" onPress={confirmarAsignacion} disabled={!seleccionadoUid} loading={guardando} />
            <Button texto="Cancelar" onPress={() => setModalVisible(false)} variant="secundario" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { gap: 10 },
  sectionTitle: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  text: { color: '#334155', fontSize: 14, lineHeight: 20 },
  textStrong: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  rowPedido: { borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 12, padding: 10, gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipEntrega: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 12,
  },
  actionWrap: { alignItems: 'flex-end' },
  btnAsignar: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnAsignarText: { color: '#0f766e', fontWeight: '700', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    padding: 14,
    gap: 10,
    maxHeight: '80%',
  },
  listDomWrap: { gap: 8 },
  rowDomi: { borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 12, padding: 10, gap: 2 },
  rowDomiSelected: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
});
