import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma';
import type { AccessTokenPayload, AuthenticatedUser } from '@task-ai/shared/types';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env['JWT_ACCESS_SECRET'] ?? 'change-me-access-secret-min-32-chars',
      passReqToCallback: false,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, disabledAt: true },
    });

    if (!user || user.disabledAt) {
      throw new UnauthorizedException('User not found or disabled');
    }

    return { userId: user.id, email: user.email };
  }
}
