import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { UserProfileResponse } from '@task-ai/shared/types';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  };

  const mockProfile: UserProfileResponse = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test',
    disabledAt: null,
    memberships: [],
  };

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('login returns access token and sets cookies', async () => {
    service.login.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: mockProfile,
    });

    const res = { cookie: jest.fn() } as any;
    const result = await controller.login(
      { email: 'test@example.com', password: 'pass' },
      { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
      res,
    );

    expect(result.accessToken).toBe('at');
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'rt',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('login rejects invalid body with Zod error', async () => {
    const res = { cookie: jest.fn() } as any;
    await expect(
      controller.login(
        { email: 'not-email', password: '' },
        {} as any,
        res,
      ),
    ).rejects.toThrow();
  });

  it('refresh returns new access token', async () => {
    service.refresh.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });

    const res = { cookie: jest.fn() } as any;
    const result = await controller.refresh(
      { cookies: { refresh_token: 'old-rt' } } as any,
      res,
    );

    expect(result.accessToken).toBe('new-at');
    expect(res.cookie).toHaveBeenCalled();
  });

  it('refresh rejects missing cookie', async () => {
    const res = { cookie: jest.fn() } as any;
    await expect(
      controller.refresh({ cookies: {} } as any, res),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logout clears cookies', async () => {
    service.logout.mockResolvedValue(undefined);
    const res = { clearCookie: jest.fn() } as any;

    const result = await controller.logout(
      { userId: 'user-1', email: 'test@example.com' } as any,
      { cookies: { refresh_token: 'rt' } } as any,
      res,
    );

    expect(result.success).toBe(true);
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/api/auth/refresh' });
    expect(res.clearCookie).toHaveBeenCalledWith('csrf_token', { path: '/api/auth' });
  });

  it('me returns user profile', async () => {
    service.getProfile.mockResolvedValue(mockProfile);

    const result = await controller.me({
      userId: 'user-1',
      email: 'test@example.com',
    } as any);

    expect(result.id).toBe('user-1');
  });
});
