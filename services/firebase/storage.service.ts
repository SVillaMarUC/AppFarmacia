import Constants from 'expo-constants';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/services/firebase/config';

type ExtraConfig = {
  disableStorageUploads?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
const storageDeshabilitado = String(extra.disableStorageUploads ?? '').toLowerCase() === 'true';

const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  return response.blob();
};

export const storageService = {
  async subirReceta(uri: string, usuarioId: string): Promise<string> {
    if (storageDeshabilitado) {
      return uri;
    }

    try {
      const blob = await uriToBlob(uri);
      const storageRef = ref(storage, `recetas/${usuarioId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      // Fallback para entornos sin billing en Firebase Storage.
      // Permite seguir probando flujos (pedido/auth) guardando una URI local temporal.
      console.warn('Storage no disponible para subir receta, se usara URI local.', error);
      return uri;
    }
  },

  async subirFotoAjuste(uri: string, itemId: string): Promise<string> {
    if (storageDeshabilitado) {
      return uri;
    }

    try {
      const blob = await uriToBlob(uri);
      const storageRef = ref(storage, `inventario-ajustes/${itemId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      // Fallback para pruebas funcionales cuando Storage no esta habilitado.
      console.warn('Storage no disponible para subir foto de ajuste, se usara URI local.', error);
      return uri;
    }
  },
};