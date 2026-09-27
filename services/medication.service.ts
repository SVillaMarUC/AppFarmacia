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
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { ItemInventario } from '@/types';
import { medicamentosIniciales } from '@/constants/medicamentos';

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
        const items = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            ...data,
            nombre: data.nombre || '',
            stock: Number(data.stock ?? data.cantidad ?? 0),
            stockMinimo: Number(data.stockMinimo ?? 5),
            activo: data.activo !== false,
            requiereReceta: Boolean(data.requiereReceta),
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
   * Obtiene la lista completa de inventario una sola vez
   */
  async obtenerInventario(): Promise<ItemInventario[]> {
    try {
      const snap = await getDocs(collection(db, 'inventario'));
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          nombre: data.nombre || '',
          stock: Number(data.stock ?? data.cantidad ?? 0),
          stockMinimo: Number(data.stockMinimo ?? 5),
          activo: data.activo !== false,
          requiereReceta: Boolean(data.requiereReceta),
        } as ItemInventario;
      });
    } catch (error) {
      console.error('[MedicationService] Error al obtener inventario:', error);
      throw new Error('No fue posible obtener el inventario de medicamentos.');
    }
  },

  /**
   * Obtiene los medicamentos activos disponibles para afiliados.
   * Si la base de datos está vacía, realiza la siembra inicial automática.
   */
  async obtenerCatalogoAfiliado(): Promise<ItemInventario[]> {
    try {
      const q = query(collection(db, 'inventario'), where('activo', '==', true));
      let snap = await getDocs(q);

      // Si el inventario en Firestore está vacío, se siembran automáticamente los medicamentos iniciales
      if (snap.empty) {
        console.log('[MedicationService] Inventario vacío. Sembrando catálogo inicial automáticamente...');
        await this.cargarMedicamentosIniciales();
        snap = await getDocs(q);
      }

      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          nombre: data.nombre || '',
          principioActivo: data.principioActivo || '',
          concentracion: data.concentracion || '',
          presentacion: data.presentacion || '',
          unidad: data.unidad || '',
          categoria: data.categoria || 'General',
          descripcion: data.descripcion || '',
          requiereReceta: Boolean(data.requiereReceta),
          stock: Number(data.stock ?? data.cantidad ?? 0),
          stockMinimo: Number(data.stockMinimo ?? 5),
          lote: data.lote || '',
          fechaVencimiento: data.fechaVencimiento || null,
          activo: true,
        } as ItemInventario;
      });
    } catch (error) {
      console.error('[MedicationService] obtenerCatalogoAfiliado error:', error);
      // Fallback local en caso de desconexión
      return medicamentosIniciales.map((m, index) => ({
        id: `local-${index + 1}`,
        ...m,
        stock: m.stock ?? 20,
        stockMinimo: m.stockMinimo ?? 5,
        activo: true,
      })) as ItemInventario[];
    }
  },

  /**
   * Carga los medicamentos iniciales en Firestore.
   * Si un medicamento ya existe por nombre, no lo duplica.
   */
  async cargarMedicamentosIniciales(): Promise<number> {
    try {
      let cantidadAgregada = 0;

      for (const item of medicamentosIniciales) {
        const nombreMed = item.nombre || '';

        const q = query(
          collection(db, 'inventario'),
          where('nombre', '==', nombreMed)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          continue;
        }

        await addDoc(collection(db, 'inventario'), {
          ...item,
          stock: Math.max(0, Number(item.stock ?? 0)),
          stockMinimo: Math.max(0, Number(item.stockMinimo ?? 5)),
          activo: item.activo !== false,
          requiereReceta: Boolean(item.requiereReceta),
          creadoEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
        });

        cantidadAgregada++;
      }

      return cantidadAgregada;
    } catch (error) {
      console.error('[MedicationService] cargarMedicamentosIniciales error:', error);
      throw new Error('No fue posible cargar los medicamentos iniciales.');
    }
  },

  /**
   * Crea un nuevo medicamento en el inventario
   */
  async crearMedicamento(item: Omit<ItemInventario, 'id' | 'creadoEn' | 'actualizadoEn'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'inventario'), {
        ...item,
        stock: Math.max(0, Number(item.stock || 0)),
        stockMinimo: Math.max(0, Number(item.stockMinimo || 5)),
        activo: item.activo !== false,
        requiereReceta: Boolean(item.requiereReceta),
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('[MedicationService] Error al crear medicamento:', error);
      throw new Error('No fue posible registrar el medicamento.');
    }
  },

  /**
   * Actualiza los datos de un medicamento
   */
  async actualizarMedicamento(id: string, cambios: Partial<ItemInventario>): Promise<void> {
    try {
      const ref = doc(db, 'inventario', id);
      const updateData: Record<string, unknown> = {
        ...cambios,
        actualizadoEn: serverTimestamp(),
      };
      if (cambios.stock !== undefined) {
        updateData.stock = Math.max(0, Number(cambios.stock));
        updateData.cantidad = updateData.stock;
      }
      if (cambios.stockMinimo !== undefined) {
        updateData.stockMinimo = Math.max(0, Number(cambios.stockMinimo));
      }
      delete updateData.id;
      delete updateData.creadoEn;

      await updateDoc(ref, updateData);
    } catch (error) {
      console.error('[MedicationService] Error al actualizar medicamento:', error);
      throw new Error('No fue posible actualizar los datos del medicamento.');
    }
  },

  /**
   * Cambia el estado activo / inactivo de un medicamento (eliminación lógica)
   */
  async toggleActivo(id: string, activoActual: boolean): Promise<void> {
    return this.actualizarMedicamento(id, { activo: !activoActual });
  },

  /**
   * Descuenta stock de múltiples medicamentos de forma ATÓMICA usando transacciones de Firestore
   * para prevenir existencias negativas y condiciones de carrera.
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
          cantidad: nuevoStock,
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
