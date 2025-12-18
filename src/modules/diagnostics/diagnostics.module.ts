import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { DiagnosticsController } from './diagnostics.controller';

@Module({
  imports: [QueueModule],
  controllers: [DiagnosticsController],
})
export class DiagnosticsModule {}
