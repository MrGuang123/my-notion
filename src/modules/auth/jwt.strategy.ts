import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub?: string;
  userId?: string;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cfg: ConfigService;

  constructor(cfgS: ConfigService) {
    const secret = cfgS.getOrThrow<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });

    this.cfg = cfgS;
  }

  validate(payload: JwtPayload) {
    return {
      ...payload,
      userId: payload.sub ?? payload.userId,
    };
  }
}
