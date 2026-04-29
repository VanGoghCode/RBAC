import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from './auth.api';
import { AuthState } from './auth.state';
import type { LoginResponse, UserProfileResponse } from '@task-ai/shared/types';

describe('AuthState', () => {
  let state: AuthState;
  let api: { login: jest.Mock; refresh: jest.Mock; logout: jest.Mock; getProfile: jest.Mock };
  let router: { navigate: jest.Mock };

  const mockProfile: UserProfileResponse = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    disabledAt: null,
    memberships: [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme', role: 'admin' }],
  };

  beforeEach(() => {
    api = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthState,
        { provide: AuthApi, useValue: api },
        { provide: Router, useValue: router },
      ],
    });

    state = TestBed.inject(AuthState);
  });

  it('login sets user and token', async () => {
    const loginRes: LoginResponse = { accessToken: 'at', user: mockProfile };
    api.login.mockReturnValue(of(loginRes));

    await state.login('test@example.com', 'pass');
    expect(state.isAuthenticated()).toBe(true);
    expect(state.user()).toEqual(mockProfile);
    expect(state.getAccessToken()).toBe('at');
  });

  it('logout clears state', async () => {
    api.logout.mockReturnValue(of({ success: true }));

    await state.logout();
    expect(state.isAuthenticated()).toBe(false);
    expect(state.user()).toBeNull();
    expect(state.getAccessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('refreshOnLoad restores state', async () => {
    api.refresh.mockReturnValue(of({ accessToken: 'at' }));
    api.getProfile.mockReturnValue(of(mockProfile));

    await state.refreshOnLoad();
    expect(state.isAuthenticated()).toBe(true);
    expect(state.user()).toEqual(mockProfile);
  });

  it('refreshOnLoad clears state on failure', async () => {
    api.refresh.mockReturnValue(throwError(() => new Error('fail')));

    await state.refreshOnLoad();
    expect(state.isAuthenticated()).toBe(false);
  });

  it('hasRole returns correct value', async () => {
    const loginRes: LoginResponse = { accessToken: 'at', user: mockProfile };
    api.login.mockReturnValue(of(loginRes));

    await state.login('test@example.com', 'pass');
    expect(state.hasRole('org-1', 'admin')).toBe(true);
    expect(state.hasRole('org-1', 'owner')).toBe(false);
    expect(state.hasRole('other-org', 'viewer')).toBe(false);
  });
});
