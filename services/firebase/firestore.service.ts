import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/services/firebase/config';

import type {
  Checkpoint,
  EstadoCheckpoint,
  ItemInventario,
  Pedido,
  TipoCheckpoint,
  Usuario,
} from '@/types';

export const firestoreService = {
  // =========================================================
  // USUARIO
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

  // =========================================================
  // PEDIDO ACTIVO DEL CLIENTE
  // =========================================================

  escucharPedidoActivo(
    uid: string,
    callback: (pedido: Pedido | null) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'pedidos'),
        where('usuarioId', '==', uid),
        where('estado', 'in', [
          'pendiente',
          'asignado',
          'en_preparacion',
          'listo',
          'en_camino',
        ])
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const docItem = snapshot.docs[0];

          if (!docItem) {
            callback(null);
            return;
          }

          const pedido = {
            id: docItem.id,
            ...(docItem.data() as Omit<Pedido, 'id'>),
          } as Pedido;

          callback(pedido);
        },
        (error) => {
          console.error(
            '[Firestore Error] escucharPedidoActivo:',
            error
          );
        }
      );
    } catch (error) {
      console.error(
        '[Firestore Error] escucharPedidoActivo catch:',
        error
      );

      throw new Error('No fue posible escuchar el pedido activo.');
    }
  },

  // =========================================================
  // CREAR PEDIDO
  // =========================================================

  async crearPedido(
    data: Omit<Pedido, 'id' | 'timestampCreacion'>
  ): Promise<string> {
    try {
      if (!data.medicamentos || !data.medicamentos.length) {
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

  // =========================================================
  // INVENTARIO
  // =========================================================

  async obtenerInventario(): Promise<ItemInventario[]> {
    try {
      const snapshot = await getDocs(collection(db, 'inventario'));

      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<ItemInventario, 'id'>),
      }));
    } catch (error) {
      console.error('[Firestore Error] obtenerInventario:', error);
      throw new Error('No fue posible obtener el inventario.');
    }
  },

  async guardarInventario(item: ItemInventario): Promise<void> {
    try {
      await setDoc(
        doc(db, 'inventario', item.id),
        item,
        { merge: true }
      );
    } catch (error) {
      console.error('[Firestore Error] guardarInventario:', error);
      throw new Error('No fue posible guardar el inventario.');
    }
  },

  // =========================================================
  // ACTUALIZAR PEDIDO
  // =========================================================

  async actualizarPedido(
    pedidoId: string,
    data: Partial<Pedido>
  ): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'pedidos', pedidoId),
        data
      );
    } catch (error) {
      console.error('[Firestore Error] actualizarPedido:', error);
      throw new Error('No fue posible actualizar el pedido.');
    }
  },

  // =========================================================
  // PEDIDOS DEL DOMICILIARIO
  // =========================================================

  escucharPedidosDomiciliario(
    uid: string,
    callback: (pedidos: Pedido[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'pedidos'),
        where('domiciliarioId', '==', uid)
      );

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
          console.error(
            '[Firestore Error] escucharPedidosDomiciliario:',
            error
          );
        }
      );
    } catch (error) {
      console.error(
        '[Firestore Error] escucharPedidosDomiciliario catch:',
        error
      );

      throw new Error(
        'No fue posible escuchar pedidos del domiciliario.'
      );
    }
  },

  // =========================================================
  // UBICACIÓN DEL DOMICILIARIO
  // =========================================================

  async actualizarUbicacionDomiciliario(
    uid: string,
    latitud: number,
    longitud: number,
    precisionGPS: number,
    pedidoActivoId?: string
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, 'ubicacionesDomiciliarios', uid),
        {
          uid,
          latitud,
          longitud,
          precisionGPS,
          pedidoActivoId: pedidoActivoId ?? null,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        '[Firestore Error] actualizarUbicacionDomiciliario:',
        error
      );

      throw new Error(
        'No fue posible actualizar la ubicación del domiciliario.'
      );
    }
  },

  // =========================================================
  // REGISTRAR CHECKPOINT
  // =========================================================

  async registrarCheckpoint(
    pedidoId: string,
    domiciliarioId: string,
    data: {
      tipo: TipoCheckpoint;
      nombre: string;
      estado: EstadoCheckpoint;
      latitud: number;
      longitud: number;
      precisionGPS: number;
      observacion?: string;
    }
  ): Promise<void> {
    try {
      const checkpointRef = doc(
        db,
        'pedidos',
        pedidoId,
        'checkpoints',
        data.tipo
      );

      await setDoc(checkpointRef, {
        tipo: data.tipo,
        nombre: data.nombre,
        estado: data.estado,
        domiciliarioId,
        latitud: data.latitud,
        longitud: data.longitud,
        precisionGPS: data.precisionGPS,
        observacion: data.observacion ?? '',
        fechaHora: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        '[Firestore Error] registrarCheckpoint:',
        error
      );

      throw new Error(
        'No fue posible registrar el checkpoint.'
      );
    }
  },

  // =========================================================
  // OBTENER CHECKPOINTS
  // =========================================================

  async obtenerCheckpoints(
    pedidoId: string
  ): Promise<Checkpoint[]> {
    try {
      const ref = collection(
        db,
        'pedidos',
        pedidoId,
        'checkpoints'
      );

      const snapshot = await getDocs(ref);

      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<Checkpoint, 'id'>),
      }));
    } catch (error) {
      console.error(
        '[Firestore Error] obtenerCheckpoints:',
        error
      );

      throw new Error(
        'No fue posible obtener los checkpoints.'
      );
    }
  },

  // =========================================================
  // ESCUCHAR CHECKPOINTS EN TIEMPO REAL
  // =========================================================

  escucharCheckpoints(
    pedidoId: string,
    callback: (checkpoints: Checkpoint[]) => void
  ): () => void {
    try {
      const ref = collection(
        db,
        'pedidos',
        pedidoId,
        'checkpoints'
      );

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
          console.error(
            '[Firestore Error] escucharCheckpoints:',
            error
          );
        }
      );
    } catch (error) {
      console.error(
        '[Firestore Error] escucharCheckpoints catch:',
        error
      );

      throw new Error(
        'No fue posible escuchar los checkpoints.'
      );
    }
  },
};