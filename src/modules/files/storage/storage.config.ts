export interface StorageConfig {
  storageType: 'local' | 's3' | 'oss';
  localPath: string;
  // 字节数
  maxFileSize: number;
  allowedMimeTypes: string[];
  signatureSecret: string;
}

export const DEFAULT_STORAGE_CONFIG: Partial<StorageConfig> = {
  storageType: 'local',
  localPath: './localData/uploads',
  maxFileSize: 100 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
};
