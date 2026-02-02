import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class InitUploadDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsNumber()
  @Min(1)
  size: number;

  @IsString()
  mime: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalChunks?: number;
}
