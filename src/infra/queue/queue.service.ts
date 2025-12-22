import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('default') private readonly queue: Queue) {}

  addDemoJob(payload: any) {
    return this.queue.add('demo', payload, {
      attempts: 3,
      removeOnComplete: true,
    });
  }
}
