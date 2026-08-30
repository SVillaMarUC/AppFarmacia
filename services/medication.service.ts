import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { ItemInventario } from '@/types';

export const DIAS_ALERTA_PROXIMO_VENCIMIENTO = 30;

export const medicationService = {
  /**
   * Escucha en tiempo real la lista completa de medicamentos/inventario
   */
  escucharInventario(callback: (items: ItemInventario[]) => void): () => void {
    const ref = collection(db, 'inventario');
    return onSnapshot(
      ref,
      (snapshot) => {
        const items = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            nombre: String(data.nombre ?? ''),
            principioActivo: data.principioActivo ? String(data.principioActivo) : undefined,
            concentracion: data.concentracion ? String(data.concentracion) : undefined,
            presentacion: data.presentacion ? String(data.presentacion) : undefined,
            unidad: data.unidad ? String(data.unidad) : undefined,
            categoria: data.categoria ? String(data.categoria) : 'General',
            descripcion: data.descripcion ? String(data.descripcion) : undefined,
            requiereReceta: Boolean(data.requiereReceta),
            stock: Number(data.stock ?? data.cantidad ?? 0),
            stockMinimo: Number(data.stockMinimo ?? 5),
            lote: data.lote ? String(data.lote) : undefined,
            fechaVencimiento: data.fechaVencimiento as Timestamp | Date | string | undefined,
            proveedor: data.proveedor ? String(data.proveedor) : undefined,
            activo: data.activo !== false, // Por defecto true
            creadoEn: data.creadoEn as Timestamp | undefined,
            actualizadoEn: data.actualizadoEn as Timestamp | undefined,
          } as ItemInventario;
        });
        callback(items);
      },
      (error) => {
        console.error('[MedicationService] Error al escuchar inventario:', error);
      }
    );
  },

  /**
   * Obtiene los medicamentos activos disponibles para afiliados
   */
  async obtenerCatalogoAfiliado(): Promise<ItemInventario[]> {
    try {
      const q = query(collection(db, 'inventario'), where('activo', '==', true));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nombre: String(data.nombre ?? ''),
          principioActivo: data.principioActivo,
          concentracion: data.concentracion,
          presentacion: data.presentacion,
          unidad: data.unidad,
          categoria: data.categoria ?? 'General',
          descripcion: data.descripcion,
          requiereReceta: Boolean(data.requiereReceta),
          stock: Number(data.stock ?? data.cantidad ?? 0),
          stockMinimo: Number(data.stockMinimo ?? 5),
          lote: data.lote,
          fechaVencimiento: data.fechaVencimiento,
          activo: true,
        } as ItemInventario;
      });
    } catch (error) {
      console.error('[MedicationService] obtenerCatalogoAfiliado error:', error);
      throw new Error('No fue posible obtener el catálogo de medicamentos.');
    }
  },

  /**
   * Crea un nuevo medicamento en inventario
   */
  async crearMedicamento(data: Omit<ItemInventario, 'id' | 'creadoEn' | 'actualizadoEn'>): Promise<string> {
    try {
      const ref = await addDoc(collection(db, 'inventario'), {
        ...data,
        stock: Math.max(0, Number(data.stock || 0)),
        stockMinimo: Math.max(0, Number(data.stockMinimo || 0)),
        activo: data.activo !== false,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error('[MedicationService] crearMedicamento error:', error);
      throw new Error('No fue posible registrar el medicamento.');
    }
  },

  /**
   * Actualiza los datos de un medicamento
   */
  async actualizarMedicamento(id: string, data: Partial<ItemInventario>): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        ...data,
        actualizadoEn: serverTimestamp(),
      };
      if (data.stock !== undefined) {
        payload.stock = Math.max(0, Number(data.stock));
      }
      if (data.stockMinimo !== undefined) {
        payload.stockMinimo = Math.max(0, Number(data.stockMinimo));
      }
      await updateDoc(doc(db, 'inventario', id), payload);
    } catch (error) {
      console.error('[MedicationService] actualizarMedicamento error:', error);
      throw new Error('No fue posible actualizar el medicamento.');
    }
  },

  /**
   * Cambia el estado activo / inactivo de un medicamento
   */
  async toggleActivo(id: string, activoActual: boolean): Promise<void> {
    return this.actualizarMedicamento(id, { activo: !activoActual });
  },

  /**
   * Descuenta stock de múltiples medicamentos de forma ATÓMICA usando transacciones de Firestore
   * para prevenir stock negativo y condiciones de carrera.
   */
  async descontarStockAtomico(items: Array<{ medicamentoId: string; cantidad: number; nombre?: string }>): Promise<void> {
    await runTransaction(db, async (transaction) => {
      // 1. Leer todos los documentos primero
      const itemsConSnapshot = await Promise.all(
        items.map(async (item) => {
          const itemRef = doc(db, 'inventario', item.medicamentoId);
          const snap = await transaction.get(itemRef);
          return { item, itemRef, snap };
        })
      );

      // 2. Validar existencias
      for (const { item, snap } of itemsConSnapshot) {
        if (!snap.exists()) {
          throw new Error(`El medicamento "${item.nombre || item.medicamentoId}" no existe en inventario.`);
        }
        const data = snap.data();
        const stockActual = Number(data?.stock ?? data?.cantidad ?? 0);
        if (stockActual < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${data?.nombre || item.nombre}". Solicitado: ${item.cantidad}, Disponible: ${stockActual}.`
          );
        }
      }

      // 3. Aplicar descuentos atómicos
      for (const { item, itemRef, snap } of itemsConSnapshot) {
        const data = snap.data();
        const stockActual = Number(data?.stock ?? data?.cantidad ?? 0);
        const nuevoStock = stockActual - item.cantidad;
        transaction.update(itemRef, {
          stock: nuevoStock,
          cantidad: nuevoStock, // Compatibilidad con campos legacy
          actualizadoEn: serverTimestamp(),
        });
      }
    });
  },

  /**
   * Restaura stock en caso de pedido cancelado o corrección
   */
  async restaurarStockAtomico(items: Array<{ medicamentoId: string; cantidad: number }>): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const itemsConSnapshot = await Promise.all(
        items.map(async (item) => {
          const itemRef = doc(db, 'inventario', item.medicamentoId);
          const snap = await transaction.get(itemRef);
          return { item, itemRef, snap };
        })
      );

      for (const { item, itemRef, snap } of itemsConSnapshot) {
        if (snap.exists()) {
          const data = snap.data();
          const stockActual = Number(data?.stock ?? data?.cantidad ?? 0);
          const nuevoStock = stockActual + item.cantidad;
          transaction.update(itemRef, {
            stock: nuevoStock,
            cantidad: nuevoStock,
            actualizadoEn: serverTimestamp(),
          });
        }
      }
    });
  },

  /**
   * Evalúa el estado de stock
   */
  evaluarEstadoStock(stock: number, stockMinimo: number): 'agotado' | 'critico' | 'bajo' | 'ok' {
    if (stock <= 0) return 'agotado';
    if (stock <= Math.max(1, Math.floor(stockMinimo * 0.5))) return 'critico';
    if (stock <= stockMinimo) return 'bajo';
    return 'ok';
  },

  /**
   * Evalúa si un medicamento está vencido o próximo a vencer
   */
  evaluarVencimiento(fecha?: Timestamp | Date | string | null): { estado: 'vigente' | 'proximo_a_vencer' | 'vencido' | 'sin_fecha'; diasRestantes?: number } {
    if (!fecha) return { estado: 'sin_fecha' };

    let dateObj: Date;
    if (fecha instanceof Date) {
      dateObj = fecha;
    } else if (typeof fecha === 'object' && 'toDate' in fecha && typeof (fecha as Timestamp).toDate === 'function') {
      dateObj = (fecha as Timestamp).toDate();
    } else {
      dateObj = new Date(String(fecha));
    }

    if (isNaN(dateObj.getTime())) return { estado: 'sin_fecha' };

    const ahora = new Date();
    const diffMs = dateObj.getTime() - ahora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { estado: 'vencido', diasRestantes: diffDias };
    }
    if (diffDias <= DIAS_ALERTA_PROXIMO_VENCIMIENTO) {
      return { estado: 'proximo_a_vencer', diasRestantes: diffDias };
    }
    return { estado: 'vigente', diasRestantes: diffDias };
  },
};
