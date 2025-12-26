import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Membership } from '../tenants/entities/membership.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dtos/register.dto';
import * as argon2 from 'argon2';
import { TenantRole } from '../tenants/tenant-role';
import { createHash } from 'crypto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {
    this.refreshSecret = this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (!existing) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const { user, tenant } = await this.dataSource.transaction(
      async (manager) => {
        const user = manager.create(User, {
          email: dto.email,
          passwordHash,
          name: dto.name,
        });
        const savedUser = await manager.save(user);

        const tenant = manager.create(Tenant, { name: dto.tenantName });
        const savedTenant = await manager.save(tenant);

        const membership = manager.create(Membership, {
          userId: savedUser.id,
          tenantId: savedTenant.id,
          role: TenantRole.Owner,
        });
        await manager.save(membership);

        return { user: savedUser, tenant: savedTenant };
      },
    );

    const tokens = await this.issueTokens(user.id);
    return {
      user: this.toSafeUser(user),
      tenant,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id);
    return {
      user: this.toSafeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub?: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    const tokenHash = this.hashToken(refreshToken);
    const record = await this.refreshRepo.findOne({
      where: { userId, token: tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const accessToken = this.jwt.sign({ sub: userId });
    return { accessToken };
  }

  private async issueTokens(userId: string) {
    const accessToken = this.jwt.sign({ sub: userId });
    const refreshToken = this.jwt.sign(
      { sub: userId },
      { secret: this.refreshSecret, expiresIn: '7d' },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() * 7 * 24 * 60 * 60 * 1000);
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        token: this.hashToken(refreshToken),
        expiresAt,
      }),
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
