import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  Headers,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { InitUploadDto } from './dtos/init-upload.dto';
import { Request, Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileQueryDto } from './dtos/file-query.dto';
import { SignedUrlDto } from './dtos/signed-url.dto';
import { File } from './entities/file.entity';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // 初始化上传
  @Post('init')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async initUpload(@Req() req: Request, @Body() dto: InitUploadDto) {
    const tenantId = req.tenantId as string;
    const userId = req.user?.userId as string;

    return this.filesService.initUpload(tenantId, userId, dto);
  }

  // 上传分片
  @Post(':id/chunk')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadChunk(
    @Req() req: Request,
    @Param('id') fileId: string,
    @Query('chunkIndex', ParseIntPipe) chunkIndex: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const tenantId = req.tenantId as string;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.uploadChunk(
      tenantId,
      fileId,
      chunkIndex,
      file.buffer,
    );
  }

  // 完成上传
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async completeUpload(@Req() req: Request, @Param('id') fileId: string) {
    const tenantId = req.tenantId as string;
    return this.filesService.completeUpload(tenantId, fileId);
  }

  // 下载文件
  @Get(':id')
  async download(
    @Req() req: Request,
    @Param('id') fileId: string,
    @Res() res: Response,
    @Query('signature') signature?: string,
    @Query('expires') expires?: string,
    @Headers('range') range?: string,
  ) {
    let tenantId: string;
    let file: File;

    // 如果有签名参数，使用签名校验
    if (signature && expires) {
      const expiresNum = parseInt(expires, 10);
      const isValid = this.filesService.verifySignature(
        fileId,
        signature,
        expiresNum,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid or expired signature');
      }
      // 签名有效，获取文件信息
      file = await this.filesService.getFile(req.tenantId || '', fileId);
      tenantId = file.tenantId;
    } else {
      // 需要鉴权
      if (!req.tenantId) {
        throw new BadRequestException('Authentication required');
      }
      tenantId = req.tenantId;
    }

    file = await this.filesService.getFile(tenantId, fileId);
    if (range) {
      return this.handleRangeRequest(tenantId, fileId, range, file, res);
    }

    const stream = await this.filesService.download(tenantId, fileId);
    res.set({
      'Content-Type': file.mime,
      'Content-Length': file.size.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
      'Accept-Ranges': 'bytes',
    });

    stream.pipe(res);
  }

  // 处理range请求
  private async handleRangeRequest(
    tenantId: string,
    fileId: string,
    range: string,
    file: File,
    res: Response,
  ) {
    // 解析range头：bytes=start-end
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      throw new BadRequestException('Invalid Range header');
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : Number(file.size) - 1;

    // 校验范围
    if (start >= file.size || end >= file.size || start > end) {
      throw new BadRequestException('Invalid range');
    }

    const contentLength = end - start + 1;
    const stream = await this.filesService.downloadRange(
      tenantId,
      fileId,
      start,
      end,
    );

    res.status(206);
    res.set({
      'Content-Type': file.mime,
      'Content-Length': contentLength.toString(),
      'Content-Range': `bytes ${start}-${end}/${file.size}`,
      'Accept-Ranges': 'bytes',
    });

    stream.pipe(res);
  }

  // 获取文件信息
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getFileInfo(@Req() req: Request, @Param('id') fileId: string) {
    const tenantId = req.tenantId as string;
    return this.filesService.getFile(tenantId, fileId);
  }

  // 查询文件列表
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  async list(@Req() req: Request, @Query() query: FileQueryDto) {
    const tenantId = req.tenantId as string;
    return this.filesService.list(tenantId, query);
  }

  // 删除文件
  @Delete()
  @UseGuards(JwtAuthGuard, TenantGuard)
  async remove(@Req() req: Request, @Param('id') fileId: string) {
    const tenantId = req.tenantId as string;
    await this.filesService.remove(tenantId, fileId);
    return { success: true };
  }

  // 生成签名URL
  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard)
  async generateSignedUrl(
    @Req() req: Request,
    @Param('id') fileId: string,
    @Body() dto: SignedUrlDto,
  ) {
    const tenantId = req.tenantId as string;

    // 确保文件存在且有权限
    await this.filesService.getFile(tenantId, fileId);
    return this.filesService.generateSignedUrl(fileId, dto.expiresIn);
  }
}
