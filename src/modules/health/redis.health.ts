import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject('REDIS_HEALTH_CLIENT') private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const start = Date.now();

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        return indicator.down({
          message: 'Redis ping failed',
        });
      }

      return indicator.up({
        latency: Date.now() - start,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Redis ping failed';
      return indicator.down({ message });
    }
  }
}
