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
  orderBy,
  serverTimestamp,
  addDoc,
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type {
  Checkpoint,
  EstadoCheckpoint,
  ItemInventario,
  Pedido,
  Pqrs,
  TipoCheckpoint,
  UbicacionDomiciliario,
  Usuario,
} from '@/types';

export const firestoreService = {
  // =========================================================
  // USUARIOS
  // =========================================================
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

  async actualizarUsuario(uid: string, data: Partial<Usuario>): Promise<void> {
    try {
      const ref = doc(db, 'usuarios', uid);
      await updateDoc(ref, {
        ...data,
        actualizadoEn: serverTimestamp(),
      });
    } catch (error) {
      console.error('[Firestore Error] actualizarUsuario:', error);
      throw new Error('No fue posible actualizar el perfil de usuario.');
    }
  },

  async obtenerUsuarios(): Promise<Usuario[]> {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, 'uid'>) }));
    } catch (error) {
      console.error('[Firestore Error] obtenerUsuarios:', error);
      return [];
    }
  },

  escucharUsuarios(callback: (usuarios: Usuario[]) => void): () => void {
    return onSnapshot(
      collection(db, 'usuarios'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, 'uid'>) }));
        callback(list);
      },
      (err) => console.error('[Firestore Error] escucharUsuarios:', err)
    );
  },

  // =========================================================
  // PEDIDOS
  // =========================================================
  escucharPedidoActivo(uid: string, callback: (pedido: Pedido | null) => void): () => void {
    try {
      const q = query(
        collection(db, 'pedidos'),
        where('usuarioId', '==', uid),
        where('estado', 'in', ['pendiente', 'asignado', 'en_preparacion', 'listo', 'en_camino'])
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const docItem = snapshot.docs[0];
          if (!docItem) {
            callback(null);
            return;
          }
          const pedido = { id: docItem.id, ...(docItem.data() as Omit<Pedido, 'id'>) } as Pedido;
          callback(pedido);
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
    const { orderService } = await import('@/services/order.service');
    return orderService.crearPedido(data as any);
  },

  async obtenerInventario(): Promise<ItemInventario[]> {
    const { medicationService } = await import('@/services/medication.service');
    return medicationService.obtenerInventario();
  },

  async guardarInventario(item: ItemInventario): Promise<void> {
    const { medicationService } = await import('@/services/medication.service');
    return medicationService.actualizarMedicamento(item.id, item);
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

  // =========================================================
  // UBICACIÓN DEL DOMICILIARIO
  // =========================================================
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

  escucharUbicacionDomiciliario(
    domiciliarioId: string,
    callback: (ubicacion: UbicacionDomiciliario | null) => void
  ): () => void {
    try {
      const ref = doc(db, 'ubicacionesDomiciliarios', domiciliarioId);
      return onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists()) {
            callback(null);
            return;
          }
          callback(snapshot.data() as UbicacionDomiciliario);
        },
        (error) => {
          console.error('[Firestore Error] escucharUbicacionDomiciliario:', error);
        }
      );
    } catch (error) {
      console.error('[Firestore Error] escucharUbicacionDomiciliario catch:', error);
      return () => {};
    }
  },

  // =========================================================
  // CHECKPOINTS DEL PEDIDO
  // =========================================================
  async registrarCheckpoint(
    pedidoId: string,
    domiciliarioId: string,
    data: {
      tipo: TipoCheckpoint;
      nombre: string;
      estado: EstadoCheckpoint;
      latitud?: number | null;
      longitud?: number | null;
      precisionGPS?: number | null;
      observacion?: string;
    }
  ): Promise<void> {
    try {
      const checkpointRef = doc(db, 'pedidos', pedidoId, 'checkpoints', data.tipo);
      await setDoc(checkpointRef, {
        tipo: data.tipo,
        nombre: data.nombre,
        estado: data.estado,
        domiciliarioId,
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
        precisionGPS: data.precisionGPS ?? null,
        observacion: data.observacion ?? '',
        fechaHora: serverTimestamp(),
      });
    } catch (error) {
      console.error('[Firestore Error] registrarCheckpoint:', error);
      throw new Error('No fue posible registrar el checkpoint.');
    }
  },

  async obtenerCheckpoints(pedidoId: string): Promise<Checkpoint[]> {
    try {
      const ref = collection(db, 'pedidos', pedidoId, 'checkpoints');
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<Checkpoint, 'id'>),
      }));
    } catch (error) {
      console.error('[Firestore Error] obtenerCheckpoints:', error);
      throw new Error('No fue posible obtener los checkpoints.');
    }
  },

  escucharCheckpoints(
    pedidoId: string,
    callback: (checkpoints: Checkpoint[]) => void
  ): () => void {
    try {
      const ref = collection(db, 'pedidos', pedidoId, 'checkpoints');
      return onSnapshot(
        ref,
        (snapshot) => {
          const checkpoints = snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as Omit<Checkpoint, 'id'>),
          }));
          callback(checkpoints);
        },
        (error) => {
          console.error('[Firestore Error] escucharCheckpoints:', error);
        }
      );
    } catch (error) {
      console.error('[Firestore Error] escucharCheckpoints catch:', error);
      return () => {};
    }
  },

  // =========================================================
  // GESTIÓN DE PQRS
  // =========================================================
  async crearPqrs(data: {
    usuarioId: string;
    usuarioNombre?: string;
    usuarioEmail?: string;
    pedidoId?: string;
    tipo: Pqrs['tipo'];
    asunto: string;
    descripcion: string;
  }): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'pqrs'), {
        ...data,
        estado: 'pendiente' as const,
        creadoEn: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('[Firestore Error] crearPqrs:', error);
      throw new Error('No fue posible registrar tu solicitud PQRS.');
    }
  },

  escucharPqrs(callback: (list: Pqrs[]) => void): () => void {
    const q = query(collection(db, 'pqrs'), orderBy('creadoEn', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Pqrs, 'id'>),
        }));
        callback(items);
      },
      (error) => {
        console.error('[Firestore Error] escucharPqrs:', error);
      }
    );
  },

  async responderPqrs(
    pqrsId: string,
    respuesta: string,
    respondidoPor: string,
    nuevoEstado: Pqrs['estado'] = 'resuelto'
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'pqrs', pqrsId), {
        respuesta,
        respondidoPor,
        estado: nuevoEstado,
        respondidoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
    } catch (error) {
      console.error('[Firestore Error] responderPqrs:', error);
      throw new Error('No fue posible responder la solicitud PQRS.');
    }
  },
};