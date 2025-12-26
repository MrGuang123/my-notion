import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Membership } from '../../modules/tenants/entities/membership.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const tenantId = this.resolveTenantId(req);
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant id');
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Missing user id');
    }

    const membership = await this.membershipRepo.findOne({
      where: { tenantId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of tenant');
    }

    req.tenantId = tenantId;
    req.tenantRole = membership.role;
    return true;
  }

  private resolveTenantId(req: Request): string | undefined {
    const headerTenant = req.get('x-tenant-id');
    if (headerTenant) return headerTenant;

    const host = req.get('host') ?? '';
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');
    if (parts.length > 2 && parts[0] !== 'localhost') {
      return parts[0];
    }
    if (parts.length >= 2 && hostWithoutPort.endsWith('localhost')) {
      return parts[0];
    }
    return undefined;
  }
}
