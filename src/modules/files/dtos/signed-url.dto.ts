import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SignedUrlDto {
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  expiresIn?: number = 3600;
}
