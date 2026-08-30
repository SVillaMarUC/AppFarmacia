import Constants from 'expo-constants';
import type { IStorageProvider, StorageFileResult, UploadOptions } from './storage.types';
import { SupabaseStorageProvider } from './providers/supabase.provider';
import { FallbackStorageProvider } from './providers/fallback.provider';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseStorageBucket?: string;
  disableStorageUploads?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;
const supabaseBucket = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || extra.supabaseStorageBucket || 'recetas-medicas';
const storageDeshabilitado = String(extra.disableStorageUploads ?? '').toLowerCase() === 'true';

class StorageService {
  private provider: IStorageProvider;

  constructor() {
    if (!storageDeshabilitado && supabaseUrl && supabaseAnonKey) {
      const supabaseProvider = new SupabaseStorageProvider(supabaseUrl, supabaseAnonKey, supabaseBucket);
      if (supabaseProvider.isConfigured()) {
        this.provider = supabaseProvider;
      } else {
        this.provider = new FallbackStorageProvider();
      }
    } else {
      this.provider = new FallbackStorageProvider();
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async uploadFile(uri: string, path: string, options?: UploadOptions): Promise<StorageFileResult> {
    return this.provider.uploadFile(uri, path, options);
  }

  async uploadReceta(uri: string, usuarioId: string, recetaId?: string): Promise<StorageFileResult> {
    const id = recetaId || `${Date.now()}`;
    const path = `recetas/${usuarioId}/${id}.jpg`;
    return this.uploadFile(uri, path, {
      contentType: 'image/jpeg',
      isPrivate: true,
    });
  }

  async uploadEvidenciaEntrega(uri: string, pedidoId: string, domiciliarioId: string): Promise<StorageFileResult> {
    const path = `evidencias/${pedidoId}/${domiciliarioId}_${Date.now()}.jpg`;
    return this.uploadFile(uri, path, {
      contentType: 'image/jpeg',
      isPrivate: true,
    });
  }

  async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    // Si la ruta ya es una URL HTTP(S) o local, retornarla directamente
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://') || path.startsWith('content://')) {
      return path;
    }
    return this.provider.getSignedUrl(path, expiresInSeconds);
  }

  async deleteFile(path: string): Promise<void> {
    return this.provider.deleteFile(path);
  }
}

export const storageService = new StorageService();
export type { StorageFileResult, UploadOptions } from './storage.types';
