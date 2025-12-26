import { IsEnum, IsUUID } from 'class-validator';
import { TenantRole } from '../tenant-role';

export class UpsertMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(TenantRole)
  role: TenantRole;
}
