import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { medicationService } from '@/services/medication.service';
import { prescriptionService } from '@/services/prescription.service';
import type { Pedido } from '@/types';

export const orderService = {
  /**
   * Crea un nuevo pedido con snapshot inmutable de cada medicamento y vinculación de receta
   */
  async crearPedido(data: {
    usuarioId: string;
    medicamentos: Array<{
      medicamentoId?: string;
      nombre: string;
      principioActivo?: string;
      concentracion?: string;
      presentacion?: string;
      dosis?: string;
      cantidad: number;
      requiereReceta?: boolean;
      observacion?: string;
    }>;
    modoEntrega: 'domicilio' | 'recogida';
    ciudad?: string;
    direccionEntrega?: Pedido['direccionEntrega'];
    recetaId?: string | null;
    recetaUrl?: string | null;
    origenSolicitud?: 'manual' | 'ocr';
    recetaOCRData?: Record<string, unknown>;
  }): Promise<string> {
    if (!data.medicamentos || data.medicamentos.length === 0) {
      throw new Error('El pedido debe incluir al menos un medicamento.');
    }

    const requiereReceta = data.medicamentos.some((m) => m.requiereReceta);
    if (requiereReceta && !data.recetaId && !data.recetaUrl) {
      throw new Error('Uno o más medicamentos seleccionados requieren receta médica obligatoria.');
    }

    // Crear snapshot inmutable
    const medicamentosSnapshot = data.medicamentos.map((m) => ({
      medicamentoId: m.medicamentoId || '',
      nombre: m.nombre.trim(),
      principioActivo: m.principioActivo || '',
      concentracion: m.concentracion || '',
      presentacion: m.presentacion || '',
      dosis: m.dosis || '',
      cantidad: Math.max(1, Number(m.cantidad || 1)),
      requiereReceta: Boolean(m.requiereReceta),
      observacion: m.observacion || '',
    }));

    const nuevoPedido = {
      usuarioId: data.usuarioId,
      medicamentos: medicamentosSnapshot,
      estado: 'pendiente' as const,
      modoEntrega: data.modoEntrega,
      ciudad: data.ciudad || '',
      direccionEntrega: data.direccionEntrega || null,
      recetaId: data.recetaId || null,
      recetaUrl: data.recetaUrl || null,
      recetaEstado: data.recetaId ? ('pendiente' as const) : undefined,
      recetaOCRData: data.recetaOCRData || {},
      origenSolicitud: data.origenSolicitud || 'manual',
      timestampCreacion: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'pedidos'), nuevoPedido);

    // Si hay una receta asociada, registrar el pedidoId en la receta
    if (data.recetaId) {
      await prescriptionService.asociarPedido(data.recetaId, docRef.id);
    }

    return docRef.id;
  },

  /**
   * Prepara y valida el pedido para despacho:
   * 1. Verifica si requiere receta y que ésta esté aprobada
   * 2. Descuenta stock atómicamente en Firestore
   * 3. Cambia estado a 'listo'
   */
  async procesarYPrepararPedido(pedidoId: string, observaciones?: string): Promise<void> {
    const pedidoRef = doc(db, 'pedidos', pedidoId);
    const snap = await getDoc(pedidoRef);
    if (!snap.exists()) {
      throw new Error('El pedido no existe.');
    }

    const pedido = snap.data() as Pedido;

    // Validar receta si algún ítem la requiere
    const tieneItemsConReceta = pedido.medicamentos.some((m) => m.requiereReceta);
    if (tieneItemsConReceta) {
      if (!pedido.recetaId) {
        throw new Error('Este pedido contiene medicamentos que requieren receta médica, pero no tiene receta adjunta.');
      }

      const receta = await prescriptionService.obtenerReceta(pedido.recetaId);
      if (!receta || receta.estado !== 'aprobada') {
        throw new Error(
          `La receta médica debe ser aprobada antes de preparar el pedido. Estado actual: ${receta?.estado ?? 'No encontrada'}.`
        );
      }
    }

    // Filtrar ítems que tienen ID de inventario para descuento de stock
    const itemsParaDescuento = pedido.medicamentos
      .filter((m) => m.medicamentoId && m.medicamentoId.trim().length > 0)
      .map((m) => ({
        medicamentoId: m.medicamentoId!,
        cantidad: m.cantidad,
        nombre: m.nombre,
      }));

    // Descontar stock atómicamente
    if (itemsParaDescuento.length > 0) {
      await medicationService.descontarStockAtomico(itemsParaDescuento);
    }

    // Actualizar estado del pedido a 'listo'
    await updateDoc(pedidoRef, {
      estado: 'listo',
      preparadoEn: serverTimestamp(),
      observacionesDespacho: observaciones || null,
    });
  },

  /**
   * Actualiza el estado de un pedido
   */
  async cambiarEstado(pedidoId: string, estado: Pedido['estado'], dataExtra?: Partial<Pedido>): Promise<void> {
    await updateDoc(doc(db, 'pedidos', pedidoId), {
      estado,
      ...dataExtra,
      ...(estado === 'entregado' ? { timestampEntrega: serverTimestamp() } : {}),
      ...(estado === 'asignado' ? { asignadoEn: serverTimestamp() } : {}),
    });
  },
};
