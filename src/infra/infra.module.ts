import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import { envSchema } from '../config/validation';
import { makeBaseTypeOrmConfig } from './database/db-config';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';

const isProd = process.env.NODE_ENV === 'production';
const configFilePath = `.env.${process.env.NODE_ENV ?? 'development'}`;
const typeOrmBaseConfig = makeBaseTypeOrmConfig(process.env);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: configFilePath,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...typeOrmBaseConfig,
        autoLoadEntities: true,
      }),
    }),
    // 每60秒每个IP最多100次
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.getOrThrow<string>('REDIS_URL'),
          keyPrefix: 'cache:',
          // 默认缓存30秒
          ttl: 30_000,
        }),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
        prefix: 'bull',
      }),
    }),
    HealthModule,
    QueueModule,
    // 自检接口，生产环境禁用
    ...(isProd ? [] : [DiagnosticsModule]),
  ],
  providers: [
    // 全局限流
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 全局jwt鉴权，不需要鉴权的接口添加@Public()装饰器
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class InfraModule {}
