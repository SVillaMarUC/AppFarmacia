import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { ItemInventario, Pedido, Usuario } from '@/types';

export const firestoreService = {
  async obtenerUsuario(uid: string): Promise<Usuario | null> {
    try {
      const ref = doc(db, 'usuarios', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return null;
      }
      return snap.data() as Usuario;
    } catch (error) {
      console.error('[Firestore Error] obtenerUsuario:', error);
      throw new Error('No fue posible obtener el usuario.');
    }
  },

  escucharPedidoActivo(uid: string, callback: (pedido: Pedido | null) => void): () => void {
    try {
      const q = query(
        collection(db, 'pedidos'),
        where('usuarioId', '==', uid),
        where('estado', 'in', ['pendiente', 'en_preparacion', 'listo', 'en_camino'])
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const pedido = snapshot.docs[0]?.data() as Pedido | undefined;
          callback(pedido ?? null);
        },
        (error) => {
          console.error('[Firestore Error] escucharPedidoActivo:', error);
        }
      );
    } catch (error) {
      console.error('[Firestore Error] escucharPedidoActivo catch:', error);
      throw new Error('No fue posible escuchar el pedido activo.');
    }
  },

  async crearPedido(data: Omit<Pedido, 'id' | 'timestampCreacion'>): Promise<string> {
    try {
      if (!data.medicamentos.length) {
        throw new Error('Debes incluir al menos un medicamento.');
      }

      const ref = await addDoc(collection(db, 'pedidos'), {
        ...data,
        timestampCreacion: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error('[Firestore Error] crearPedido:', error);
      throw new Error('No fue posible crear el pedido.');
    }
  },

  async obtenerInventario(): Promise<ItemInventario[]> {
    try {
      const snapshot = await getDocs(collection(db, 'inventario'));
      return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Omit<ItemInventario, 'id'>) }));
    } catch (error) {
      console.error('[Firestore Error] obtenerInventario:', error);
      throw new Error('No fue posible obtener el inventario.');
    }
  },

  async guardarInventario(item: ItemInventario): Promise<void> {
    try {
      await setDoc(doc(db, 'inventario', item.id), item, { merge: true });
    } catch (error) {
      console.error('[Firestore Error] guardarInventario:', error);
      throw new Error('No fue posible guardar el inventario.');
    }
  },

  async actualizarPedido(pedidoId: string, data: Partial<Pedido>): Promise<void> {
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), data);
    } catch (error) {
      console.error('[Firestore Error] actualizarPedido:', error);
      throw new Error('No fue posible actualizar el pedido.');
    }
  },

  escucharPedidosDomiciliario(uid: string, callback: (pedidos: Pedido[]) => void): () => void {
    try {
      const q = query(collection(db, 'pedidos'), where('domiciliarioId', '==', uid));
      return onSnapshot(
        q,
        (snapshot) => {
          const pedidos = snapshot.docs.map((pedido) => ({
            id: pedido.id,
            ...(pedido.data() as Omit<Pedido, 'id'>),
          }));
          callback(pedidos);
        },
        (error) => {
          console.error('[Firestore Error] escucharPedidosDomiciliario:', error);
        }
      );
    } catch (error) {
      console.error('[Firestore Error] escucharPedidosDomiciliario catch:', error);
      throw new Error('No fue posible escuchar pedidos del domiciliario.');
    }
  },

  async actualizarUbicacionDomiciliario(
    uid: string,
    latitud: number,
    longitud: number,
    pedidoActivoId?: string
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, 'ubicacionesDomiciliarios', uid),
        {
          uid,
          latitud,
          longitud,
          pedidoActivoId: pedidoActivoId ?? null,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[Firestore Error] actualizarUbicacionDomiciliario:', error);
      throw new Error('No fue posible actualizar la ubicación del domiciliario.');
    }
  },
};