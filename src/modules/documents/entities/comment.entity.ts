import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  // 使用了SnakeNamingStrategy，docId会自动转换为doc_id，为了和下面的JoinColumn对应，所以专门定义一下
  @Column({ name: 'doc_id', type: 'int' })
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
  // 定义外键列，不指定会默认生成document_id这样的外键列，无法和上面的doc_id对应
  @JoinColumn({ name: 'doc_id' })
  document: Document;
}
