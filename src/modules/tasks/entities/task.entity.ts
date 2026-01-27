import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus } from '../task-status.enum';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 64,
  })
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 200,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.Todo,
  })
  status: TaskStatus;

  @Column({
    type: 'jsonb',
    default: '[]',
  })
  assignees: string[];

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'due_date',
  })
  dueDate: Date | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'created_by',
  })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
