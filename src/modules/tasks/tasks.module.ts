import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { QueueModule } from '../../infra/queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksProcessor } from './tasks.processor';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), QueueModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService],
})
export class TasksModule {}
