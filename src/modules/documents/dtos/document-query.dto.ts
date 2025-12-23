import { IsIn, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class DocumentQueryDto {
  @IsOptional()
  @IsIn(['recent', 'hot'])
  sort?: 'recent' | 'hot';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
