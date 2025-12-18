import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('default')
export class DefaultProcessor extends WorkerHost {
  private readonly logger = new Logger(DefaultProcessor.name);

  async process(job: Job) {
    this.logger.log(
      `Processing job name=${job.name} id=${job.id} data=${JSON.stringify(job.data)}`,
    );
    // 实际任务逻辑

    return Promise.resolve(true);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.log(`Job ${job.id} failed: ${err.message}`);
  }
}
