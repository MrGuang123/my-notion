import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const reqId = req.get('x-request-id') ?? '-';
    const tenantId = req.get('x-tenant-id') ?? '-';
    const userId = req.user?.userId ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        console.log(
          `[${method}] ${url} ${status} ${duration}ms req-id=${reqId} tenant=${tenantId} user=${userId}`,
        );
      }),
    );
  }
}
