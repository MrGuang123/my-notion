import { SetMetadata } from '@nestjs/common';
import { TenantRole } from '../../modules/tenants/tenant-role';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TenantRole[]) => SetMetadata(ROLES_KEY, roles);
