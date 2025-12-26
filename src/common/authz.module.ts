import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from '../modules/tenants/entities/membership.entity';
import { TenantGuard } from './guards/tenant.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  providers: [TenantGuard, RolesGuard],
  exports: [TenantGuard, RolesGuard],
})
export class AuthzModule {}
