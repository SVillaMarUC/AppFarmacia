import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IStorageProvider, StorageFileResult, UploadOptions } from '../storage.types';

export class SupabaseStorageProvider implements IStorageProvider {
  public readonly name = 'supabase';
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor(supabaseUrl?: string, supabaseAnonKey?: string, bucketName?: string) {
    this.bucket = bucketName || 'recetas-medicas';
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
      this.client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async uploadFile(uri: string, path: string, options?: UploadOptions): Promise<StorageFileResult> {
    if (!this.client) {
      throw new Error('Supabase Storage no está configurado correctamente.');
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const contentType = options?.contentType || blob.type || 'image/jpeg';
      const fileSize = blob.size;

      // Normalizar path eliminando barras iniciales
      const cleanPath = path.replace(/^\/+/, '');

      const { data, error } = await this.client.storage
        .from(this.bucket)
        .upload(cleanPath, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('[Supabase Storage Upload Error]:', error);
        throw new Error(`Error al subir archivo a Supabase: ${error.message}`);
      }

      // Obtener URL firmada inicial (por defecto 1 hora = 3600 segundos)
      const signedUrl = await this.getSignedUrl(data.path, 3600);

      return {
        storagePath: data.path,
        url: signedUrl,
        fileSize,
        mimeType: contentType,
        provider: this.name,
      };
    } catch (error) {
      console.error('[SupabaseStorageProvider uploadFile]:', error);
      throw error instanceof Error ? error : new Error('Fallo en la carga a Supabase Storage.');
    }
  }

  async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.client) {
      return path; // Fallback si no está configurado
    }

    try {
      const cleanPath = path.replace(/^\/+/, '');
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .createSignedUrl(cleanPath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        console.warn('[Supabase Storage getSignedUrl Warning]:', error?.message);
        return path;
      }

      return data.signedUrl;
    } catch (err) {
      console.error('[Supabase Storage getSignedUrl Catch]:', err);
      return path;
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.client) return;
    try {
      const cleanPath = path.replace(/^\/+/, '');
      const { error } = await this.client.storage.from(this.bucket).remove([cleanPath]);
      if (error) {
        console.warn('[Supabase Storage deleteFile Error]:', error.message);
      }
    } catch (err) {
      console.error('[Supabase Storage deleteFile Catch]:', err);
    }
  }
}
