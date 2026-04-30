import { randomUUID } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '@task-ai/auth';
import { AuditRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import type { LoginDto } from './dto';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  MembershipResponse,
  UserProfileResponse,
} from '@task-ai/shared/types';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserProfileResponse;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditRepository,
  ) {}

  async login(dto: LoginDto, ipHash?: string, userAgentHash?: string): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: email,
        metadata: { reason: 'not_found' },
        ipHash,
        userAgentHash,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.disabledAt) {
      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { reason: 'disabled' },
        ipHash,
        userAgentHash,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { reason: 'wrong_password' },
        ipHash,
        userAgentHash,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.issueAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    await this.audit.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'user',
      resourceId: user.id,
      ipHash,
      userAgentHash,
    });

    const profile = await this.getProfile(user.id);

    return { accessToken, user: profile, refreshToken };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!token) throw new UnauthorizedException('Missing refresh token');

    // Decode to get payload
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(token, {
        secret: process.env['JWT_REFRESH_SECRET'] ?? (() => { throw new Error('JWT_REFRESH_SECRET not configured'); })(),
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'JWT_REFRESH_SECRET not configured') throw e;
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Look up the token row
    const tokenRow = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!tokenRow) {
      // Token was already revoked — possible reuse. Revoke entire family.
      await this.revokeFamily(payload.family);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (tokenRow.revokedAt) {
      // Already used — revoke family
      await this.revokeFamily(tokenRow.family);
      throw new UnauthorizedException('Refresh token already used');
    }

    if (tokenRow.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, create new with same family
    await this.prisma.refreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRow.userId },
      select: { id: true, email: true, disabledAt: true },
    });

    if (!user || user.disabledAt) {
      throw new UnauthorizedException('User not found or disabled');
    }

    const accessToken = this.issueAccessToken(user.id, user.email);
    const newRefreshToken = await this.createRefreshToken(user.id, tokenRow.family);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, token?: string): Promise<void> {
    if (token) {
      const tokenRow = await this.prisma.refreshToken.findUnique({
        where: { token },
      });
      if (tokenRow) {
        await this.prisma.refreshToken.update({
          where: { id: tokenRow.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    await this.audit.log({
      actorId: userId,
      action: 'LOGOUT',
      resourceType: 'user',
      resourceId: userId,
    });
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { org: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const memberships: MembershipResponse[] = user.memberships.map((m) => ({
      orgId: m.org.id,
      orgName: m.org.name,
      orgSlug: m.org.slug,
      role: m.role,
    }));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      disabledAt: user.disabledAt?.toISOString() ?? null,
      memberships,
    };
  }

  private issueAccessToken(userId: string, email: string): string {
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      type: 'access',
    };
    return this.jwt.sign(payload, {
      secret: process.env['JWT_ACCESS_SECRET'] ?? (() => { throw new Error('JWT_ACCESS_SECRET not configured'); })(),
      expiresIn: '15m',
    });
  }

  private async createRefreshToken(userId: string, family?: string): Promise<string> {
    const tokenFamily = family ?? randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const payload: RefreshTokenPayload = {
      sub: userId,
      family: tokenFamily,
      type: 'refresh',
    };

    const token = this.jwt.sign(payload, {
      secret: process.env['JWT_REFRESH_SECRET'] ?? (() => { throw new Error('JWT_REFRESH_SECRET not configured'); })(),
      expiresIn: '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        family: tokenFamily,
        expiresAt,
      },
    });

    return token;
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
