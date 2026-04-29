import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot, provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthState } from './auth.state';
import type { UserProfileResponse } from '@task-ai/shared/types';

describe('Auth Guards', () => {
  let authState: AuthState;
  let router: { navigate: jest.Mock };

  const mockProfile: UserProfileResponse = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test',
    disabledAt: null,
    memberships: [],
  };

  beforeEach(() => {
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthState,
        { provide: Router, useValue: router },
      ],
    });

    authState = TestBed.inject(AuthState);
  });

  describe('authGuard', () => {
    it('allows authenticated user', () => {
      (authState as any)._user.set(mockProfile);
      (authState as any)._accessToken.set('token');

      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(result).toBe(true);
    });

    it('redirects unauthenticated to /login', () => {
      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('guestGuard', () => {
    it('redirects authenticated to /', () => {
      (authState as any)._user.set(mockProfile);
      (authState as any)._accessToken.set('token');

      const result = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('allows unauthenticated', () => {
      const result = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      expect(result).toBe(true);
    });
  });
});
