import { Injectable, Logger } from '@nestjs/common';
import { FilesService } from '../files.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FileCleanupJob {
  private readonly logger = new Logger(FileCleanupJob.name);

  constructor(private readonly filesService: FilesService) {}

  // 每小时执行一次清理任务
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    this.logger.log('Starting file cleanup job...');

    try {
      const count = await this.filesService.cleanupExpiredUploads();
      this.logger.log(`Cleaned up ${count} expired uploads`);
    } catch (error) {
      this.logger.error('File cleanup job failed:', error);
    }
  }
}
