import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { DiagnosticsModule } from './infra/diagnostics/diagnostics.module';
import { InfraModule } from './infra/infra.module';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    InfraModule,
    AuthModule,
    // 自检接口，生产环境禁用
    ...(isProd ? [] : [DiagnosticsModule]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
