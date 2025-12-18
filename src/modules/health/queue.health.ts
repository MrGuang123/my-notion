import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Queue } from 'bullmq';

@Injectable()
export class QueueHealthIndicator {
  constructor(
    @InjectQueue('default') private readonly queue: Queue,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.queue.waitUntilReady();
      const client = await this.queue.client;
      const pong = await client.ping();
      if (pong !== 'PONG') {
        return indicator.down({
          message: 'Queue Redis ping failed',
        });
      }
      return indicator.up();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Queue Redis ping failed';
      return indicator.down({ message });
    }
  }
}
