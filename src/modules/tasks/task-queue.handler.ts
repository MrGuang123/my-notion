import { Injectable, Logger } from '@nestjs/common';
import { QueueHandler } from '../../infra/queue/unified.processor';
import { NotificationsService } from '../notifications/notifications.service';
import { Job } from 'bullmq';
import { TaskEvent } from './events/task-event.interface';
import { NotificationType } from '../notifications/notification-type.enum';

@Injectable()
export class TaskQueueHandler implements QueueHandler {
  private readonly logger = new Logger(TaskQueueHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  canHandle(jobName: string): boolean {
    return jobName.startsWith('task.');
  }

  async handle(job: Job<TaskEvent>): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case 'task.assigned':
        await this.handleTaskAssigned(data);
        break;
      case 'task.updated':
        break;
      default:
        this.logger.warn(`Unknown task job: ${name}`);
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
