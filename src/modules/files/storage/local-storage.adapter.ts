/* eslint-disable @typescript-eslint/no-unused-vars */
import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { FileMetadata, FileStorage } from './storage.interface';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class LocalStorageAdapter implements FileStorage {
  private readonly basePath: string;
  private readonly tempPath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = this.configService.getOrThrow<string>(
      'STORAGE_LOCAL_PATH',
      './localData/uploads',
    );
    this.tempPath = path.join(this.basePath, 'temp');

    this.ensureDir(this.basePath);
    this.ensureDir(this.tempPath);
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // 下面那些暂时没用的参数，先留着
  async initUpload(
    uploadId: string,
    filename: string,
    size: number,
    mime: string,
    tenantId: string,
  ): Promise<void> {
    const tempDir = path.join(this.tempPath, uploadId);
    await fs.promises.mkdir(tempDir, { recursive: true });
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<void> {
    const chunkPath = path.join(
      this.tempPath,
      uploadId,
      `chunk-${String(chunkIndex).padStart(6, '0')}`,
    );
    await fs.promises.writeFile(chunkPath, buffer);
  }

  async completeUpload(
    uploadId: string,
    finalPath: string,
    totalChunks: number,
  ): Promise<void> {
    const tempDir = path.join(this.tempPath, uploadId);
    const fullPath = path.join(this.basePath, finalPath);

    // 确保目标目录存在
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    // 读取所有分片并按顺序排序
    const chunks = await fs.promises.readdir(tempDir);
    const sortedChunks = chunks
      .filter((name) => name.startsWith('chunk-'))
      .sort();

    // 验证分片数量
    if (sortedChunks.length !== totalChunks) {
      throw new Error(
        `Missing chunks: expected ${totalChunks}, got ${sortedChunks.length}`,
      );
    }

    const writeStream = fs.createWriteStream(fullPath);
    for (const chunkName of sortedChunks) {
      const chunkPath = path.join(tempDir, chunkName);
      const buffer = await fs.promises.readFile(chunkPath);
      await new Promise<void>((resolve, reject) => {
        writeStream.write(buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // 关闭写入流
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err) => {
        if (err) reject(new Error('Stream end failed'));
        else resolve();
      });
    });

    // 清理临时文件
    this.cleanupTempFiles(uploadId);
  }

  async getStream(storagePath: string): Promise<Readable> {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      // 先异步检查文件是否存在
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error('File not found or not readable');
    }

    return fs.createReadStream(fullPath);
  }

  async getStreamRange(
    storagePath: string,
    start: number,
    end: number,
  ): Promise<Readable> {
    const fullPath = path.join(this.basePath, storagePath);

    try {
      // 先异步检查文件是否存在
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error('File not found or not readable');
    }

    return fs.createReadStream(fullPath, { start, end });
  }

  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async getFileInfo(storagePath: string): Promise<FileMetadata> {
    const fullPath = path.join(this.basePath, storagePath);
    const stats = await fs.promises.stat(fullPath);
    return {
      size: stats.size,
      exists: true,
    };
  }

  async cleanupTempFiles(uploadId: string): Promise<void> {
    const tempDir = path.join(this.tempPath, uploadId);
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
}
