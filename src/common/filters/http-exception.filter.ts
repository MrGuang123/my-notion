import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
  message?: string | string[];
  error?: unknown;
  [key: string]: unknown;
};
const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const resBody =
      exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[] = 'Internal server error';
    let errors: unknown;

    if (typeof resBody === 'string') {
      message = resBody;
    } else if (isRecord(resBody)) {
      const maybe = resBody as ErrorResponse;
      if (typeof maybe.message === 'string' || Array.isArray(maybe.message)) {
        message = maybe.message;
      }
      if ('error' in maybe) {
        errors = maybe.error;
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
