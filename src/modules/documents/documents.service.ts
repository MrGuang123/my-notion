import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { DocumentQueryDto } from './dtos/document-query.dto';
import { UpdateDocumentDto } from './dtos/update-document.dto';

const LIST_TTL_MS = 120_000;
const LIST_VERSION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateDocumentDto,
  ) {
    const doc = this.docRepo.create({
      tenantId,
      title: dto.title,
      content: dto.content,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const saved = await this.docRepo.save(doc);
    await this.bumpListVersion(tenantId);
    return saved;
  }

  async list(tenantId: string, query: DocumentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort = query.sort ?? 'recent';
    const version = await this.getListVersion(tenantId);
    const cacheKey = `doc:list:${tenantId}:${sort}:${version}:p${page}:s${pageSize}`;

    const cached = await this.cache.get<{
      items: Document[];
      total: number;
    }>(cacheKey);
    if (cached) {
      return {
        ...cached,
        page,
        pageSize,
      };
    }

    const skip = (page - 1) * pageSize;
    let items: Document[] = [];
    let total = 0;

    if (sort === 'hot') {
      const qb = this.docRepo
        .createQueryBuilder('doc')
        .leftJoin('doc.comments', 'comment')
        .where('doc.tenantId = :tenantId', { tenantId })
        .groupBy('doc.id')
        .orderBy('COUNT(comment.id)', 'DESC')
        .addOrderBy('doc.updatedAt', 'DESC')
        .skip(skip)
        .take(pageSize);

      [items, total] = await qb.getManyAndCount();
    } else {
      [items, total] = await this.docRepo.findAndCount({
        where: { tenantId },
        order: { updatedAt: 'DESC' },
        skip,
        take: pageSize,
      });
    }

    await this.cache.set(cacheKey, { items, total }, LIST_TTL_MS);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(tenantId: string, id: number) {
    const doc = await this.docRepo.findOne({
      where: { id, tenantId },
    });

    if (!doc) throw new NotFoundException('Document not found');

    return doc;
  }

  async update(
    tenantId: string,
    id: number,
    userId: string | undefined,
    dto: UpdateDocumentDto,
  ) {
    const doc = await this.docRepo.findOne({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.version !== dto.version) {
      throw new ConflictException('Version mismatch');
    }
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.content !== undefined) doc.content = dto.content;
    doc.updatedBy = userId ?? doc.updatedBy;

    const saved = await this.docRepo.save(doc);
    await this.bumpListVersion(tenantId);
    return saved;
  }

  async remove(tenantId: string, id: number) {
    const doc = await this.docRepo.findOne({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.docRepo.delete({ id, tenantId });
    await this.bumpListVersion(tenantId);
    return { deleted: true };
  }

  async bumpListVersion(tenantId: string) {
    const versionKey = `doc:list:version:${tenantId}`;
    await this.cache.set(versionKey, Date.now(), LIST_VERSION_TTL_MS);
  }

  private async getListVersion(tenantId: string) {
    const versionKey = `doc:list:version:${tenantId}`;
    const version = await this.cache.get<number>(versionKey);
    if (!version) {
      await this.cache.set(versionKey, Date.now(), LIST_VERSION_TTL_MS);
      return Date.now();
    }

    return version;
  }
}
