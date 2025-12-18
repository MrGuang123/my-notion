import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Req } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Request } from 'express';

@Controller('debug')
export class DiagnosticsController {
  constructor(
    @InjectQueue('default') private readonly queue: Queue,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @Get('diagnostics')
  async diagnostics(@Req() req: Request) {
    const cacheKey = `diag:${Date.now()}`;
    await this.cache.set(cacheKey, 'ok', 10_000);
    const cached = await this.cache.get<string>(cacheKey);
    const job = await this.queue.add('diagnostics', { at: Date.now() });

    return {
      requestId: req.get('x-request-id') ?? req.headers['x-request-id'],
      cacheOK: cached === 'ok',
      queueJobId: job.id ?? null,
    };
  }
}
