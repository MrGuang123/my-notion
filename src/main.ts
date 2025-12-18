import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { requestIdMiddleware } from './common/middlewares/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 设置helmet
  app.use(helmet());
  // 设置cors
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  // 请求头添加requestId
  app.use(requestIdMiddleware);

  // 设置全局路由前缀
  app.setGlobalPrefix('api', {
    // 如果有需要跳过的路由在这里设置
    // exclude: ['/'],
  });

  // 设置全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      // 过滤DTO以外的字段
      whitelist: true,
      // 自动转换基本类型
      transform: true,
      // 遇到多余字段直接抛错
      forbidNonWhitelisted: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局日志、耗时拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 添加swagger，包括基础分组和Bearer auth
  const config = new DocumentBuilder()
    .setTitle('My Notion Api')
    .setDescription('Api Docs')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'Bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
