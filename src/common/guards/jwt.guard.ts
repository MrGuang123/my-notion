import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Request } from 'express';

interface JwtPayload {
  sub?: string;
  userId?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.get('authorization');
    if (!auth?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing token');

    try {
      // 使用JWT_SECRET 校验并提取 payload
      const payload = this.jwt.verify<JwtPayload>(auth.slice(7));
      req.user = { ...payload, userId: payload.sub ?? payload.userId };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
