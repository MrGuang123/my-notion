import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentQueryDto } from './dtos/comment-query.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Request } from 'express';

@UseGuards(TenantGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('docs/:id/comments')
  list(
    @Req() req: Request,
    @Param('id', ParseIntPipe) docId: number,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentsService.listByDoc(req.tenantId as string, docId, query);
  }

  @Post('docs/:id/comments')
  create(
    @Req() req: Request,
    @Param('id', ParseIntPipe) docId: number,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.commentsService.create(
      req.tenantId as string,
      userId,
      docId,
      dto,
    );
  }

  @Delete('comments/:id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.commentsService.remove(req.tenantId as string, id, userId);
  }
}
