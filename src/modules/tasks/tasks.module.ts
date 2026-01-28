import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { QueueModule } from '../../infra/queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskQueueHandler } from './task-queue.handler';
import { UnifiedProcessor } from '../../infra/queue/unified.processor';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), QueueModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskQueueHandler],
  exports: [TasksService],
})
export class TasksModule {
  constructor(
    private readonly unifiedProcessor: UnifiedProcessor,
    private readonly tasksHandler: TaskQueueHandler,
  ) {
    this.unifiedProcessor.registerHandler(this.tasksHandler);
  }
}
