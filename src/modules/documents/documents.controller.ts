import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { TenantGuard } from '@/src/common/guards/tenant.guard';
import { DocumentQueryDto } from './dtos/document-query.dto';
import { UpdateDocumentDto } from './dtos/update-document.dto';

@UseGuards(TenantGuard)
@Controller('docs')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateDocumentDto) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.documentsService.create(req.tenantId as string, userId, dto);
  }

  @Get()
  list(@Req() req: Request, @Query() query: DocumentQueryDto) {
    return this.documentsService.list(req.tenantId as string, query);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(req.tenantId as string, id);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
  ) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.documentsService.update(
      req.tenantId as string,
      id,
      userId,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.documentsService.remove(req.tenantId as string, id);
  }
}
