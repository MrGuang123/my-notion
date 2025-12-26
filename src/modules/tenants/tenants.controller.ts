import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Request } from 'express';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRole } from './tenant-role';
import { UpsertMemberDto } from './dtos/upsert-member.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateTenantDto) {
    return this.tenantsService.createForUser(req.user?.userId as string, dto);
  }

  @UseGuards(TenantGuard, RolesGuard)
  @Roles(TenantRole.Owner, TenantRole.Admin)
  @Get(':id/members')
  listMembers(@Req() req: Request, @Param('id') id: string) {
    if (req.tenantId !== id) {
      throw new ForbiddenException('Tenant mismatch');
    }

    return this.tenantsService.listMembers(id);
  }

  @UseGuards(TenantGuard, RolesGuard)
  @Roles(TenantRole.Owner, TenantRole.Admin)
  @Post(':id/members')
  upsertMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpsertMemberDto,
  ) {
    if (req.tenantId !== id) {
      throw new ForbiddenException('Tenant mismatch');
    }

    return this.tenantsService.upsertMember(id, dto);
  }
}
