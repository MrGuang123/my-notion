import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { DocumentsService } from './documents.service';
import { Comment } from './entities/comment.entity';
import { Document } from './entities/document.entity';
import { CommentQueryDto } from './dtos/comment-query.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';

@Injectable()
export class CommentsService {
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @Inject('REDIS_COMMENT_LIMITER') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly documentsService: DocumentsService,
  ) {
    this.limit = this.config.get<number>('COMMENT_RATE_LIMIT') ?? 10;
    this.windowMs = this.config.get<number>('COMMENT_RATE_TTL_MS') ?? 60_000;
  }

  async listByDoc(tenantId: string, docId: number, query: CommentQueryDto) {
    await this.ensureDocExists(tenantId, docId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.commentRepo.findAndCount({
      where: { tenantId, docId },
      order: { createDateAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    docId: number,
    dto: CreateCommentDto,
  ) {
    if (!userId) {
      throw new ForbiddenException('Missing user id');
    }
    await this.ensureDocExists(tenantId, docId);
    await this.enforceRateLimit(tenantId, docId, userId);

    const comment = this.commentRepo.create({
      tenantId,
      docId,
      userId,
      body: dto.body,
    });

    const saved = await this.commentRepo.save(comment);
    await this.documentsService.bumpListVersion(tenantId);
    return saved;
  }

  async remove(
    tenantId: string,
    commendId: number,
    userId: string | undefined,
  ) {
    const comment = await this.commentRepo.findOne({
      where: { id: commendId, tenantId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (userId && comment.userId !== userId) {
      throw new ForbiddenException('No permission to delete comment');
    }

    await this.commentRepo.delete({ id: commendId });
    await this.documentsService.bumpListVersion(tenantId);
    return { deleted: true };
  }

  private async ensureDocExists(tenantId: string, docId: number) {
    const doc = await this.docRepo.findOne({
      where: { id: docId, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');
  }

  private async enforceRateLimit(
    tenantId: string,
    docId: number,
    userId: string,
  ) {
    const key = `comment:rate:${tenantId}:${docId}:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, this.windowMs);
    }
    if (count > this.limit) {
      throw new HttpException(
        'Too many comments',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
