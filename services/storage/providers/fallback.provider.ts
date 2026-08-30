import type { IStorageProvider, StorageFileResult, UploadOptions } from '../storage.types';

export class FallbackStorageProvider implements IStorageProvider {
  public readonly name = 'fallback';

  isConfigured(): boolean {
    return true;
  }

  async uploadFile(uri: string, path: string, options?: UploadOptions): Promise<StorageFileResult> {
    console.info(`[FallbackStorageProvider] Guardando referencia local para desarrollo: ${path}`);
    return {
      storagePath: path,
      url: uri,
      fileSize: 1024,
      mimeType: options?.contentType || 'image/jpeg',
      provider: this.name,
    };
  }

  async getSignedUrl(path: string): Promise<string> {
    return path;
  }

  async deleteFile(path: string): Promise<void> {
    console.info(`[FallbackStorageProvider] Eliminando referencia: ${path}`);
  }
}
