import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma';
import type { RefreshTokenPayload } from '@task-ai/shared/types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (req: any) => req?.cookies?.['refresh_token'] ?? null,
      secretOrKey: process.env['JWT_REFRESH_SECRET'] ?? 'change-me-refresh-secret-min-32-chars',
      passReqToCallback: false,
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<{ userId: string; family: string }> {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Token existence and revocation are checked in AuthService.refresh
    return { userId: payload.sub, family: payload.family };
  }
}
