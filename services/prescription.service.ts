import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { storageService } from '@/services/storage/storage.service';
import type { EstadoReceta, RecetaMedica, RecetaOCRItem } from '@/types';

export const prescriptionService = {
  /**
   * Sube la imagen de la receta al Object Storage (Supabase Storage / Fallback) y guarda los metadatos en Firestore.
   * NUNCA almacena base64 en Firestore.
   */
  async crearReceta(
    usuarioId: string,
    localUri: string,
    ocrData?: {
      textoCrudo?: string;
      medicamentosDetectados?: RecetaOCRItem[];
    }
  ): Promise<RecetaMedica> {
    try {
      if (!usuarioId) {
        throw new Error('ID de usuario requerido para registrar la receta.');
      }
      if (!localUri) {
        throw new Error('URI de imagen requerida para la receta médica.');
      }

      // 1. Subir la imagen a Object Storage
      const uploadResult = await storageService.uploadReceta(localUri, usuarioId);

      // 2. Guardar únicamente los metadatos y la ruta relativa en Firestore
      const docData = {
        usuarioId,
        pedidoId: null,
        storagePath: uploadResult.storagePath,
        mimeType: uploadResult.mimeType || 'image/jpeg',
        fileSize: uploadResult.fileSize || 0,
        estado: 'pendiente' as EstadoReceta,
        ocr: {
          textoCrudo: ocrData?.textoCrudo || '',
          medicamentosDetectados: ocrData?.medicamentosDetectados || [],
          procesadoAt: serverTimestamp(),
          valido: Boolean(ocrData?.medicamentosDetectados?.length),
        },
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'recetas'), docData);

      return {
        id: docRef.id,
        ...docData,
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
        urlTemporal: uploadResult.url,
      } as unknown as RecetaMedica;
    } catch (error) {
      console.error('[PrescriptionService] Error al crear receta:', error);
      throw error instanceof Error ? error : new Error('No fue posible registrar la receta médica.');
    }
  },

  /**
   * Obtiene la receta médica por ID con su URL temporal firmada
   */
  async obtenerReceta(recetaId: string): Promise<RecetaMedica | null> {
    try {
      if (!recetaId) return null;
      const snap = await getDoc(doc(db, 'recetas', recetaId));
      if (!snap.exists()) return null;

      const data = snap.data() as Omit<RecetaMedica, 'id'>;
      const urlTemporal = await storageService.getSignedUrl(data.storagePath);

      return {
        ...data,
        id: snap.id,
        urlTemporal,
      } as RecetaMedica;
    } catch (error) {
      console.error('[PrescriptionService] Error al obtener receta:', error);
      throw new Error('No fue posible obtener los datos de la receta médica.');
    }
  },

  /**
   * Obtiene una URL firmada segura para visualizar la receta médica
   */
  async obtenerUrlSegura(storagePath: string): Promise<string> {
    return storageService.getSignedUrl(storagePath, 3600);
  },

  /**
   * Actualiza el estado de validación de la receta (aprobada, rechazada, revision)
   */
  async actualizarEstadoReceta(
    recetaId: string,
    estado: EstadoReceta,
    opciones?: { motivoRechazo?: string; observaciones?: string }
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'recetas', recetaId), {
        estado,
        motivoRechazo: opciones?.motivoRechazo ?? null,
        observaciones: opciones?.observaciones ?? null,
        actualizadoEn: serverTimestamp(),
      });
    } catch (error) {
      console.error('[PrescriptionService] Error al actualizar estado receta:', error);
      throw new Error('No fue posible actualizar el estado de la receta.');
    }
  },

  /**
   * Asocia una receta a un pedido
   */
  async asociarPedido(recetaId: string, pedidoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'recetas', recetaId), {
        pedidoId,
        actualizadoEn: serverTimestamp(),
      });
    } catch (error) {
      console.error('[PrescriptionService] Error al asociar pedido a receta:', error);
    }
  },

  /**
   * Escucha cambios en tiempo real de una receta
   */
  escucharReceta(recetaId: string, callback: (receta: RecetaMedica | null) => void): () => void {
    return onSnapshot(
      doc(db, 'recetas', recetaId),
      async (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        const data = snapshot.data() as Omit<RecetaMedica, 'id'>;
        const urlTemporal = await storageService.getSignedUrl(data.storagePath);
        callback({
          ...data,
          id: snapshot.id,
          urlTemporal,
        } as RecetaMedica);
      },
      (error) => {
        console.error('[PrescriptionService] Error al escuchar receta:', error);
      }
    );
  },
};
