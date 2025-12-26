import { Injectable, NotFoundException } from '@nestjs/common';
import { Tenant } from './entities/tenant.entity';
import { Repository } from 'typeorm';
import { Membership } from './entities/membership.entity';
import { User } from '../users/entities/user.entity';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { TenantRole } from './tenant-role';
import { InjectRepository } from '@nestjs/typeorm';
import { UpsertMemberDto } from './dtos/upsert-member.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createForUser(userId: string, dto: CreateTenantDto) {
    const tenant = await this.tenantRepo.save(
      this.tenantRepo.create({ name: dto.name }),
    );

    await this.membershipRepo.save(
      this.membershipRepo.create({
        userId,
        tenantId: tenant.id,
        role: TenantRole.Owner,
      }),
    );

    return tenant;
  }

  async listMembers(tenantId: string) {
    return this.membershipRepo
      .createQueryBuilder('m')
      .leftJoin('m.user', 'u')
      .where('m.tenantId = :tenantId', { tenantId })
      .select(['m.id', 'm.role', 'm.createdAt', 'u.id', 'u.email', 'u.name'])
      .getMany();
  }

  async upsertMember(tenantId: string, dto: UpsertMemberDto) {
    const user = await this.userRepo.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.membershipRepo.findOne({
      where: { tenantId, userId: dto.userId },
    });
    if (existing) {
      existing.role = dto.role;
      return this.membershipRepo.save(existing);
    }

    return this.membershipRepo.save(
      this.membershipRepo.create({
        tenantId,
        userId: dto.userId,
        role: dto.role,
      }),
    );
  }
}
