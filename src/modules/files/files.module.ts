import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { File } from './entities/file.entity';
import { FilesController } from './file.controller';
import { FilesService } from './files.service';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './storage/local-storage.adapter';
import { FileCleanupJob } from './jobs/cleanup.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 单个分片最大 10MB
      },
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileCleanupJob,
    {
      provide: 'FILE_STORAGE',
      useFactory: (configService: ConfigService) => {
        const storageType = configService.getOrThrow<string>(
          'STORAGE_TYPE',
          'local',
        );
        if (storageType === 'local') {
          return new LocalStorageAdapter(configService);
        }

        // 未来拓展其它类型存储

        throw new Error(`Unsupported storage type: ${storageType}`);
      },
      inject: [ConfigService],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
