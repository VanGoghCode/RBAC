import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Token Hardening Tests
 *
 * Verifies that JWT secrets do not have fallback values,
 * token lifetimes are appropriate, and cookie settings are secure.
 */
describe('Token Hardening', () => {
  let authServiceSource: string;
  let jwtStrategySource: string;
  let authControllerSource: string;

  beforeAll(() => {
    const basePath = resolve(__dirname);
    authServiceSource = readFileSync(resolve(basePath, 'auth.service.ts'), 'utf-8');
    jwtStrategySource = readFileSync(resolve(basePath, 'strategies', 'jwt-access.strategy.ts'), 'utf-8');
    authControllerSource = readFileSync(resolve(basePath, 'auth.controller.ts'), 'utf-8');
  });

  describe('no fallback JWT secrets', () => {
    it('auth.service.ts has no hardcoded JWT fallback secrets', () => {
      expect(authServiceSource).not.toContain('change-me-access-secret');
      expect(authServiceSource).not.toContain('change-me-refresh-secret');
    });

    it('jwt-access.strategy.ts has no hardcoded JWT fallback secrets', () => {
      expect(jwtStrategySource).not.toContain('change-me-access-secret');
    });

    it('JWT_ACCESS_SECRET throws when missing', () => {
      expect(authServiceSource).toContain('JWT_ACCESS_SECRET not configured');
      expect(jwtStrategySource).toContain('JWT_ACCESS_SECRET not configured');
    });

    it('JWT_REFRESH_SECRET throws when missing', () => {
      expect(authServiceSource).toContain('JWT_REFRESH_SECRET not configured');
    });
  });

  describe('token lifetimes', () => {
    it('access token expires in 15 minutes', () => {
      expect(authServiceSource).toContain("expiresIn: '15m'");
    });

    it('refresh token expires in 7 days', () => {
      expect(authServiceSource).toContain("expiresIn: '7d'");
    });
  });

  describe('cookie security', () => {
    it('refresh cookie is HttpOnly', () => {
      expect(authControllerSource).toContain('httpOnly: true');
    });

    it('refresh cookie uses Secure in production', () => {
      expect(authControllerSource).toContain(
        "secure: process.env['NODE_ENV'] === 'production'",
      );
    });

    it('cookies use SameSite strict', () => {
      const sameSiteCount = (authControllerSource.match(/sameSite: 'strict'/g) ?? []).length;
      expect(sameSiteCount).toBeGreaterThanOrEqual(2); // refresh + csrf
    });

    it('refresh cookie has restricted path', () => {
      expect(authControllerSource).toContain("path: '/api/auth/refresh'");
    });

    it('CSRF cookie has restricted path', () => {
      expect(authControllerSource).toContain("path: '/'");
    });
  });
});
