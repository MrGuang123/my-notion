import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { makeBaseTypeOrmConfig } from './database/db-config';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './modules/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { APP_GUARD } from '@nestjs/core';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV ?? 'development'}`,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...makeBaseTypeOrmConfig(process.env),
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        // 60秒窗口
        ttl: 60_000,
        // 每个IP100次
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
    AuthModule,
    DiagnosticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局限流
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
