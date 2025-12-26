import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Membership } from './membership.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 120,
  })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.tenant)
  memberships: Membership[];
}
