import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { makeBaseTypeOrmConfig } from './database/db-config';
import { JwtModule } from '@nestjs/jwt';

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
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
