import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hashPassword } from '@task-ai/auth';
import { AuditRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    orgMembership: { findMany: jest.Mock };
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let auditRepo: { log: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '',
    disabledAt: null,
  };

  let originalJwtAccessSecret: string | undefined;
  let originalJwtRefreshSecret: string | undefined;

  beforeAll(async () => {
    originalJwtAccessSecret = process.env.JWT_ACCESS_SECRET;
    originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    mockUser.passwordHash = await hashPassword('password123');
  });

  afterAll(() => {
    if (originalJwtAccessSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = originalJwtAccessSecret;
    }
    if (originalJwtRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
    }
  });

  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      orgMembership: { findMany: jest.fn() },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    auditRepo = { log: jest.fn().mockResolvedValue(undefined) };

    moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditRepository, useValue: auditRepo },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  // ─── Login ───────────────────────────────────────────────────

  describe('login', () => {
    it('returns access token with valid credentials', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // login lookup
        .mockResolvedValueOnce({ ...mockUser, memberships: [] }); // getProfile lookup
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login({ email: 'test@example.com', password: 'password123' });
      expect(result.accessToken).toBe('mock-token');
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-1');
    });

    it('normalizes email (uppercase + spaces)', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, memberships: [] });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await service.login({ email: '  TEST@EXAMPLE.COM  ', password: 'password123' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      );
    });

    it('rejects wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects disabled user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, disabledAt: new Date() });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('uses generic error message (does not reveal which field)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await service.login({ email: 'nobody@example.com', password: 'password123' });
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe('Invalid credentials');
      }
    });

    it('writes audit log on success', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, memberships: [] });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await service.login({ email: 'test@example.com', password: 'password123' });
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      );
    });

    it('writes audit log on failure', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      try { await service.login({ email: 'nobody@example.com', password: 'x' }); } catch { /* expected */ }
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────

  describe('refresh', () => {
    const mockTokenRow = {
      id: 'rt-1',
      token: 'old-token',
      userId: 'user-1',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };

    it('rotates refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', family: 'family-1', type: 'refresh' });
      prisma.refreshToken.findUnique.mockResolvedValue(mockTokenRow);
      prisma.refreshToken.update.mockResolvedValue({ ...mockTokenRow, revokedAt: new Date() });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', disabledAt: null });

      const result = await service.refresh('old-token');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(prisma.refreshToken.update).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('rejects missing token', async () => {
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects expired token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', family: 'family-1', type: 'refresh' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockTokenRow,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects reused token and revokes family', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', family: 'family-1', type: 'refresh' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.refresh('reused-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { family: 'family-1', revokedAt: null } }),
      );
    });

    it('rejects already revoked token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', family: 'family-1', type: 'refresh' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockTokenRow,
        revokedAt: new Date(),
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', token: 'tok', userId: 'user-1', family: 'f1', revokedAt: null,
      });
      prisma.refreshToken.update.mockResolvedValue({});

      await service.logout('user-1', 'tok');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
    });

    it('writes audit log', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await service.logout('user-1', 'tok');
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT' }),
      );
    });
  });

  // ─── GetProfile ──────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns user profile with memberships', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [
          { org: { id: 'org-1', name: 'Acme', slug: 'acme' }, role: 'admin' },
        ],
      });

      const profile = await service.getProfile('user-1');
      expect(profile.id).toBe('user-1');
      expect(profile.memberships).toHaveLength(1);
      expect(profile.memberships[0].role).toBe('admin');
    });

    it('never returns password hash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [],
      });

      const profile = await service.getProfile('user-1');
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).password_hash).toBeUndefined();
    });
  });
});
