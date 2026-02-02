import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileStatus } from '../file-status.enum';

@Entity('files')
@Index(['tenantId', 'createdAt'])
@Index(['status'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  filename: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  mime: string;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.UPLOADING,
  })
  status: FileStatus;

  @Column({
    nullable: true,
  })
  storagePath: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  uploadId: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  totalChunks: number | null;

  @Column({
    default: 0,
  })
  uploadedChunks: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
