import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TenantRole } from '../tenant-role';
import { User } from '../../users/entities/user.entity';
import { Tenant } from './tenant.entity';

@Entity('memberships')
@Unique(['userId', 'tenantId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: string;

  @Column({
    name: 'tenant_id',
    type: 'uuid',
  })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: TenantRole,
    default: TenantRole.Member,
  })
  role: TenantRole;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Tenant, (tenant) => tenant.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
