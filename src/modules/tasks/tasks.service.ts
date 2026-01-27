import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from './task-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Repository } from 'typeorm';
import { QueueService } from '../../infra/queue/queue.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { TaskEventType } from './events/task-event.interface';
import { TaskQueryDto } from './dtos/task-query.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';

@Injectable()
export class TasksService {
  private readonly validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.Todo]: [TaskStatus.Doing],
    [TaskStatus.Doing]: [TaskStatus.Todo, TaskStatus.Done],
    [TaskStatus.Done]: [TaskStatus.Doing],
  };

  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly queueService: QueueService,
  ) {}

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateTaskDto,
  ) {
    const task = this.taskRepo.create({
      tenantId,
      title: dto.title,
      description: dto.description ?? null,
      assignees: dto.assignees ?? [],
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy: userId ?? null,
    });

    const saved = await this.taskRepo.save(task);

    if (saved.assignees.length > 0) {
      await this.queueService.addJob('task.assigned', {
        type: TaskEventType.TaskAssigned,
        tenantId: saved.tenantId,
        taskId: saved.id,
        taskTitle: saved.title,
        actorId: userId,
        assignees: saved.assignees,
        previousAssignees: [],
      });
    }

    return saved;
  }

  async list(tenantId: string, query: TaskQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.tenantId = :tenantId', { tenantId });

    // 按状态过滤
    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    // 按指派人过滤（JSONB）查询
    if (query.assignee) {
      qb.andWhere('task.assignees @> :assignees', {
        assignees: JSON.stringify([query.assignee]),
      });
    }

    const [items, total] = await qb
      .orderBy('task.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(tenantId: string, id: number) {
    const task = await this.taskRepo.findOne({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    tenantId: string,
    id: number,
    userId: string | undefined,
    dto: UpdateTaskDto,
  ) {
    const task = await this.findOne(tenantId, id);
    const previousAssignees = [...task.assignees];

    // 状态流转校验
    if (dto.status && dto.status !== task.status) {
      this.validateStatusTransition(task.status, dto.status);
      task.status = dto.status;
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dueDate !== undefined)
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    if (dto.assignees !== undefined) {
      task.assignees = dto.assignees;

      // 找出新增的assignees
      const newAssignees = dto.assignees.filter(
        (a) => !previousAssignees.includes(a),
      );
      if (newAssignees.length > 0) {
        await this.queueService.addJob('task.assigned', {
          type: TaskEventType.TaskAssigned,
          tenantId: task.tenantId,
          taskId: task.id,
          taskTitle: task.title,
          actorId: userId,
          assignees: newAssignees,
          previousAssignees,
        });
      }
    }

    return this.taskRepo.save(task);
  }

  async remove(tenantId: string, id: number) {
    const task = await this.findOne(tenantId, id);
    await this.taskRepo.remove(task);
    return { deleted: true };
  }

  private validateStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ) {
    const allowedStatuses = this.validTransitions[currentStatus];

    if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `1Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
