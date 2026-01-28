import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { UnifiedProcessor } from './unified.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'default' })],
  providers: [QueueService, UnifiedProcessor],
  exports: [QueueService, UnifiedProcessor],
})
export class QueueModule {}
