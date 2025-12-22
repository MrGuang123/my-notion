import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { QueueHealthIndicator } from './queue.health';
import Redis from 'ioredis';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TerminusModule, QueueModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    QueueHealthIndicator,
    {
      provide: 'REDIS_HEALTH_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL')),
    },
  ],
})
export class HealthModule {}
