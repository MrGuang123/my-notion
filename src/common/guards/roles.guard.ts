import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Request } from 'express';
import { TenantRole } from '../../modules/tenants/tenant-role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = req.tenantRole as TenantRole | undefined;

    if (!role) throw new ForbiddenException('Missing tenant role');
    if (!roles.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
