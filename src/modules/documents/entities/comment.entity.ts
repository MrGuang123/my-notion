import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  docId: number;

  @Column({
    type: 'varchar',
    length: 64,
  })
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 64,
  })
  userId: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createDateAt: Date;

  @ManyToOne(() => Document, (doc) => doc.comments, { onDelete: 'CASCADE' })
  document: Document;
}
