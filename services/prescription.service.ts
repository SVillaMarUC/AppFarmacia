import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

// Inicializamos el cliente directamente con las variables de entorno de Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const storageService = {
  /**
   * Sube la imagen a Supabase Storage convirtiéndola a ArrayBuffer
   */
  async uploadReceta(localUri: string, usuarioId: string) {
    if (!supabase) {
      throw new Error(
        'El cliente de Supabase no está configurado. Revisa tu archivo .env'
      );
    }

    try {
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${usuarioId}/${Date.now()}.${fileExt}`;
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // 1. Leer la imagen local en formato Base64 con Expo FileSystem
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 2. Subir a Supabase usando el ArrayBuffer decodificado
      const { data, error } = await supabase.storage
        .from('recetas') // Nombre del bucket en tu panel de Supabase
        .upload(fileName, decode(base64), {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        throw new Error(`Error en Supabase Storage: ${error.message}`);
      }

      // 3. Generar URL firmada
      const urlResult = await this.getSignedUrl(data.path);

      return {
        storagePath: data.path,
        mimeType,
        fileSize: 0,
        url: urlResult,
      };
    } catch (error) {
      console.error('[StorageService] Error al subir receta:', error);
      throw error;
    }
  },

  /**
   * Genera una URL firmada temporal para visualizar la imagen
   */
  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    if (!supabase) return '';

    try {
      const { data, error } = await supabase.storage
        .from('recetas')
        .createSignedUrl(storagePath, expiresIn);

      if (error || !data) {
        throw new Error('No se pudo generar la URL firmada');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('[StorageService] Error al obtener URL firmada:', error);
      return '';
    }
  },
};