import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { CommentsController } from './comments.controller';
import { Document } from './entities/document.entity';
import { Comment } from './entities/comment.entity';
import { DocumentsService } from './documents.service';
import { CommentsService } from './comments.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Comment])],
  controllers: [DocumentsController, CommentsController],
  providers: [
    DocumentsService,
    CommentsService,
    // 这里单独实例化一个Redis是为了给comment限流使用的，因为cache_manager是抽象缓存层
    // 不方便一些原子操作
    {
      provide: 'REDIS_COMMENT_LIMITER',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL')),
    },
  ],
})
export class DocumentsModule {}
