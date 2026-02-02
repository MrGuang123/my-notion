import { Readable } from 'stream';

// export interface FileMetadata {
//   filename: string;
//   size: number;
//   mime: string;
//   storagePath: string;
// }
export interface FileMetadata {
  size: number;
  exists: boolean;
}

export interface FileStorage {
  // 初始上传会话
  initUpload(
    uploadId: string,
    filename: string,
    size: number,
    mime: string,
    tenantId: string,
  ): Promise<void>;

  // 上传分片
  uploadChunk(
    uploadId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<void>;

  // 完成上传，合并分片
  completeUpload(
    uploadId: string,
    finalPath: string,
    totalChunks: number,
  ): Promise<void>;

  // 获取文件读取流
  getStream(storagePath: string): Promise<Readable>;

  // 获取文件读取流支持范围
  getStreamRange(
    storagePath: string,
    start: number,
    end: number,
  ): Promise<Readable>;

  // 删除文件
  deleteFile(storagePath: string): Promise<void>;

  // 获取文件元信息
  getFileInfo(storagePath: string): Promise<FileMetadata>;

  // 清理临时文件
  cleanupTempFiles(uploadId: string): Promise<void>;
}
