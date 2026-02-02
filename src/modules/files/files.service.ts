import * as crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { Repository } from 'typeorm';
import { FileStorage } from './storage/storage.interface';
import { ConfigService } from '@nestjs/config';
import { InitUploadDto } from './dtos/init-upload.dto';
import { FileValidator } from './utils/file-validator';
import { FileStatus } from './file-status.enum';
import { Readable } from 'stream';
import { FileQueryDto } from './dtos/file-query.dto';

@Injectable()
export class FilesService {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly signatureSecret: string;

  constructor(
    @InjectRepository(File) private readonly fileRepository: Repository<File>,
    @Inject('FILE_STORAGE') private readonly storage: FileStorage,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>(
      'FILE_MAX_SIZE',
      100 * 1024 * 1024,
    );
    this.allowedMimeTypes = this.configService
      .get<string>('FILE_ALLOWED_MIMES', '')
      .split(',')
      .filter(Boolean);
    this.signatureSecret = this.configService.get<string>(
      'FILE_SIGNATURE_SECRET',
      'default-secret-change-me',
    );
  }

  // 初始化上传
  async initUpload(
    tenantId: string,
    userId: string,
    dto: InitUploadDto,
  ): Promise<{ uploadId: string; fileId: string }> {
    // 校验文件大小
    if (dto.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize} bytes`,
      );
    }
    // 校验MIME类型
    if (!FileValidator.validateMime(dto.mime, this.allowedMimeTypes)) {
      throw new BadRequestException(
        `MIME type ${dto.mime} is not allowed. Allowed types: ${this.allowedMimeTypes.join(',')}`,
      );
    }

    const uploadId = crypto.randomUUID();
    const storagePath = FileValidator.generateStoragePath(
      tenantId,
      dto.filename,
      uploadId,
    );

    // 创建文件记录
    const file = this.fileRepository.create({
      tenantId,
      filename: FileValidator.sanitizeFilename(dto.filename),
      size: dto.size,
      mime: dto.mime,
      status: FileStatus.UPLOADING,
      storagePath,
      uploadId,
      totalChunks: dto.totalChunks || 1,
      uploadedChunks: 0,
      createdBy: userId,
    });
    await this.fileRepository.save(file);

    // 初始化存储
    await this.storage.initUpload(
      uploadId,
      dto.filename,
      dto.size,
      dto.mime,
      tenantId,
    );
    return {
      uploadId,
      fileId: file.id,
    };
  }

  // 上传分片
  async uploadChunk(
    tenantId: string,
    fileId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<{
    uploaded: boolean;
    uploadedChunks: number;
    totalChunks: number;
  }> {
    // 查询文件记录
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    // 校验租户权限
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    // 校验状态
    if (file.status !== FileStatus.UPLOADING) {
      throw new BadRequestException('File is not in uploading status');
    }

    // 校验 uploadId 和 totalChunks 是否存在
    if (!file.uploadId || file.totalChunks === null) {
      throw new BadRequestException('Invalid file upload state');
    }

    // 校验分片索引
    if (chunkIndex < 0 || chunkIndex >= file.totalChunks) {
      throw new BadRequestException(
        `Invalid chunk index: ${chunkIndex}. Expected 0-${file.totalChunks - 1}`,
      );
    }

    // 上传分片
    await this.storage.uploadChunk(file.uploadId, chunkIndex, buffer);
    // 更新已上传分片数
    await this.fileRepository.increment({ id: fileId }, 'uploadedChunks', 1);
    // 重新查询获取最新数据
    const updatedFile = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    return {
      uploaded: true,
      uploadedChunks: updatedFile?.uploadedChunks ?? 0,
      totalChunks: updatedFile?.totalChunks ?? 0,
    };
  }

  // 完成上传
  async completeUpload(tenantId: string, fileId: string): Promise<File> {
    // 查询文件记录
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    // 校验租户权限
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    // 校验状态
    if (file.status !== FileStatus.UPLOADING) {
      throw new BadRequestException('File is not in uploading status');
    }

    // 校验 uploadId、storagePath 和 totalChunks 是否存在
    if (!file.uploadId || !file.storagePath || file.totalChunks === null) {
      throw new BadRequestException('Invalid file upload state');
    }

    // 校验分片索引
    if (file.uploadedChunks < file.totalChunks) {
      throw new BadRequestException(
        `Missing chunks: uploaded ${file.uploadedChunks}/${file.totalChunks}`,
      );
    }

    try {
      await this.storage.completeUpload(
        file.uploadId,
        file.storagePath,
        file.totalChunks,
      );
      file.status = FileStatus.READY;
      file.uploadId = null;
      await this.fileRepository.save(file);
      return file;
    } catch (error) {
      file.status = FileStatus.FAILED;
      await this.fileRepository.save(file);
      throw error;
    }
  }

  // 获取文件信息
  async getFile(tenantId: string, fileId: string): Promise<File> {
    // 查询文件记录
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    // 校验租户权限
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return file;
  }

  // 下载文件
  async download(tenantId: string, fileId: string): Promise<Readable> {
    const file = await this.getFile(tenantId, fileId);

    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('File is not ready for download');
    }

    return this.storage.getStream(file.storagePath);
  }

  // 下载文件，支持range
  async downloadRange(
    tenantId: string,
    fileId: string,
    start: number,
    end: number,
  ): Promise<Readable> {
    const file = await this.getFile(tenantId, fileId);

    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('File is not ready for download');
    }

    return this.storage.getStreamRange(file.storagePath, start, end);
  }

  // 生成签名URL
  generateSignedUrl(
    fileId: string,
    expiresIn: number = 3600,
  ): { url: string; expiresAt: string } {
    const expiresAt = Date.now() + expiresIn * 1000;
    const data = `${fileId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.signatureSecret)
      .update(data)
      .digest('hex');

    return {
      url: `/api/files/${fileId}?signature=${signature}&expires=${expiresAt}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  // 校验签名
  verifySignature(fileId: string, signature: string, expires: number): boolean {
    // 校验过期时间
    if (Date.now() > expires) {
      return false;
    }

    // 重新计算签名
    const data = `${fileId}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.signatureSecret)
      .update(data)
      .digest('hex');

    return signature === expectedSignature;
  }

  // 查询文件列表
  async list(
    tenantId: string,
    query: FileQueryDto,
  ): Promise<{ data: File[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, status, createdBy } = query;
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .where('file.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('file.status = :status', { status });
    }
    if (createdBy) {
      queryBuilder.andWhere('file.createdBy = :createdBy', { createdBy });
    }

    const [data, total] = await queryBuilder
      .orderBy('file.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total, page, pageSize };
  }

  // 删除文件
  async remove(tenantId: string, fileId: string): Promise<void> {
    const file = await this.getFile(tenantId, fileId);

    // 删除物理文件
    if (file.storagePath) {
      try {
        await this.storage.deleteFile(file.storagePath);
      } catch (error) {
        // 文件可能已不存在，记录但不抛出错误
        console.warn(`Failed to delete file ${file.storagePath}:`, error);
      }
    }

    // 清理临时文件
    if (file.uploadId) {
      try {
        await this.storage.cleanupTempFiles(file.uploadId);
      } catch (error) {
        // 临时文件可能已被清理，记录但不抛出错误
        console.warn(
          `Failed to cleanup temp files for ${file.uploadId}:`,
          error,
        );
      }
    }

    // 删除数据库记录
    await this.fileRepository.remove(file);
  }

  // 清理过期的上传（定时任务使用）
  async cleanupExpiredUploads(): Promise<number> {
    const expiredTime = new Date();
    expiredTime.setHours(expiredTime.getHours() - 24);

    const expiredFiles = await this.fileRepository.find({
      where: {
        status: FileStatus.UPLOADING,
      },
    });
    const toCleanup = expiredFiles.filter(
      (file) => file.createdAt < expiredTime,
    );

    for (const file of toCleanup) {
      try {
        // 清理临时文件
        if (file.uploadId) {
          await this.storage.cleanupTempFiles(file.uploadId);
        }

        file.status = FileStatus.FAILED;
        await this.fileRepository.save(file);
      } catch (error) {
        console.error(`Failed to cleanup file ${file.id}:`, error);
      }
    }

    return toCleanup.length;
  }
}
