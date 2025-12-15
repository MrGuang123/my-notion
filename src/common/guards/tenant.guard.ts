import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    ctx: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const tenantId = req.get('x-tenant-id');
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant id');
    }
    req.tenantId = tenantId;
    return true;
  }
}
