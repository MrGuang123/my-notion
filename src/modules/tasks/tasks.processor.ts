import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { Job } from 'bullmq';
import { TaskEvent } from './events/task-event.interface';
import { NotificationType } from '../notifications/notification-type.enum';

@Injectable()
@Processor('default')
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<TaskEvent>): Promise<void> {
    const { name, data } = job;
    this.logger.log(`Processing job ${name} with id ${job.id}`);

    if (name === 'task.assigned') {
      await this.handleTaskAssigned(data);
    }
  }

  private async handleTaskAssigned(event: TaskEvent) {
    const { taskId, taskTitle, assignees, actorId } = event;

    if (!assignees || assignees.length === 0) {
      return;
    }

    const promises = assignees.map((userId) => {
      return this.notificationsService.create(
        userId,
        NotificationType.TaskAssigned,
        {
          taskId,
          taskTitle,
          assignedBy: actorId ?? 'system',
          assignedAt: new Date().toISOString(),
        },
      );
    });

    await Promise.all(promises);

    this.logger.log(
      `Created ${assignees.length} notifications for task ${taskId}`,
    );
  }
}
