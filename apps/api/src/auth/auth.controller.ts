import { randomUUID } from 'node:crypto';
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import { CurrentUser } from './decorators';
import { LoginSchema } from './dto';
import { CsrfGuard } from './guards/csrf.guard';
import { ThrottlerBehindProxyGuard } from './guards/throttler-behind-proxy.guard';
import type { AuthenticatedUser, LoginResponse } from '@task-ai/shared/types';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
@UseGuards(ThrottlerBehindProxyGuard, CsrfGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginResponse, 'refreshToken'>> {
    const dto = LoginSchema.parse(body);
    const ipHash = req.ip ?? undefined;
    const userAgentHash = req.headers['user-agent'] ?? undefined;

    const result = await this.authService.login(dto, ipHash, userAgentHash);

    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('csrf_token', randomUUID(), CSRF_COOKIE_OPTIONS);

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    if (!token) throw new UnauthorizedException('Missing refresh token');

    const result = await this.authService.refresh(token);

    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    await this.authService.logout(user.userId, token);
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    res.clearCookie('csrf_token', { path: '/api/auth' });
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }
}
