export interface StorageFileResult {
  storagePath: string;
  url: string; // URL firmada o pública según corresponda
  fileSize?: number;
  mimeType?: string;
  provider: string;
}

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  isPrivate?: boolean;
}

export interface IStorageProvider {
  name: string;
  uploadFile(uri: string, path: string, options?: UploadOptions): Promise<StorageFileResult>;
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(path: string): Promise<void>;
  isConfigured(): boolean;
}
