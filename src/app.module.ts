import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { InfraModule } from './infra/infra.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [InfraModule, AuthModule, DocumentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
