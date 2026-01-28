import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../notification-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 64,
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'jsonb',
    default: '{}',
  })
  payload: Record<string, unknown>;

  @Column({
    type: 'boolean',
    default: false,
  })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
