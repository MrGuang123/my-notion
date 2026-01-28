import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// 定义handler接口
export interface QueueHandler {
  canHandle(jobName: string): boolean;
  handle(job: Job): Promise<void>;
}

@Injectable()
@Processor('default')
export class UnifiedProcessor extends WorkerHost {
  private readonly logger = new Logger(UnifiedProcessor.name);
  private handlers: QueueHandler[] = [];

  constructor() {
    super();
  }

  registerHandler(handler: QueueHandler) {
    this.handlers.push(handler);
    this.logger.log(`Registered handler: ${handler.constructor.name}`);
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job name=${job.name} id=${job.id}`);
    // 实际任务逻辑
    const handler = this.handlers.find((h) => h.canHandle(job.name));
    if (!handler) {
      this.logger.warn(`No handler found for job: ${job.name}`);
      return;
    }

    await handler.handle(job);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.name} id: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job failed: ${job.name} id: ${job.id} failed: ${err.message}`,
    );
  }
}
