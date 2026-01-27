import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
// import { DefaultProcessor } from './queue.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'default' })],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
