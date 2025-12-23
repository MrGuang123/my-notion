import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Comment } from './comment.entity';

@Entity('documents')
export class Document {
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

  @Column({ type: 'jsonb' })
  content: Record<string, unknown>;

  @VersionColumn()
  version: number;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  createdBy: string | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.document)
  comments: Comment[];
}
