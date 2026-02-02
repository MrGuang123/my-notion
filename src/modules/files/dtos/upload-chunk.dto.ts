import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UploadChunkDto {
  @IsNumber()
  @Min(0)
  chunkIndex: number;

  @IsOptional()
  @IsString()
  md5?: string;
}
