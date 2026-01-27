export enum TaskEventType {
  TaskCreated = 'task_created',
  TaskAssigned = 'task_assigned',
  TaskUpdated = 'task_updated',
}

export interface TaskEvent {
  type: TaskEventType;
  tenantId: string;
  taskId: number;
  taskTitle: string;
  actorId?: string;
  assignees?: string[];
  previousAssignees?: string[];
}
