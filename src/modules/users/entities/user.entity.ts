import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Membership } from '../../tenants/entities/membership.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 120,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 200,
  })
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 60,
  })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];
}
