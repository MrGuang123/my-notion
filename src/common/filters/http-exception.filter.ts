import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type HttpErrorBody = {
  message?: string | string[];
  error?: unknown;
  [k: string]: unknown;
};
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (isObject(body)) {
        const err = body as HttpErrorBody;
        if (typeof err.message === 'string' || Array.isArray(err.message)) {
          message = err.message;
        }

        if ('error' in err) {
          errors = err.error;
        }
      }
    }

    res.status(status).json({
      code: status,
      message,
      errors,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
