import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from './auth.api';
import type { UserProfileResponse, OrgRole, MembershipResponse } from '@task-ai/shared/types';

const ACTIVE_ORG_KEY = 'taskai_active_org';
const USER_KEY = 'taskai_user';

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<UserProfileResponse | null>(this._loadUser());
  private readonly _activeOrgId = signal<string | null>(localStorage.getItem(ACTIVE_ORG_KEY));
  private _refreshPromise: Promise<void> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly accessToken = this._accessToken.asReadonly();
  readonly activeOrgId = computed(() => {
    const active = this._activeOrgId();
    if (active) return active;
    const memberships = this._user()?.memberships ?? [];
    return memberships.length > 0 ? memberships[0].orgId : null;
  });
  readonly activeOrg = computed<MembershipResponse | null>(() => {
    const id = this.activeOrgId();
    const memberships = this._user()?.memberships ?? [];
    return memberships.find((m) => m.orgId === id) ?? null;
  });

  login(email: string, password: string) {
    return new Promise<void>((resolve, reject) => {
      this.api.login(email, password).subscribe({
        next: (res) => {
          this._accessToken.set(res.accessToken);
          this._user.set(res.user);
          this._persistUser(res.user);
          this._restoreActiveOrg(res.user.memberships);
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  refreshOnLoad(): Promise<void> {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = new Promise((resolve) => {
      this.api.refresh().subscribe({
        next: (res) => {
          this._accessToken.set(res.accessToken);
          this.api.getProfile().subscribe({
            next: (profile) => {
              this._user.set(profile);
              this._persistUser(profile);
              this._restoreActiveOrg(profile.memberships);
              this._refreshPromise = null;
              resolve();
            },
            error: () => {
              this.clear();
              this._refreshPromise = null;
              this.router.navigate(['/login']);
              resolve();
            },
          });
        },
        error: () => {
          this.clear();
          this._refreshPromise = null;
          this.router.navigate(['/login']);
          resolve();
        },
      });
    });
    return this._refreshPromise;
  }

  logout(): Promise<void> {
    return new Promise((resolve) => {
      this.api.logout().subscribe({
        next: () => {
          this.clear();
          this.router.navigate(['/login']);
          resolve();
        },
        error: () => {
          this.clear();
          this.router.navigate(['/login']);
          resolve();
        },
      });
    });
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  hasRole(orgId: string, role: OrgRole): boolean {
    const user = this._user();
    if (!user) return false;
    const roles = user.memberships
      .filter((m) => m.orgId === orgId)
      .map((m) => m.role);
    const levels: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
    return roles.some((r) => (levels[r] ?? 0) >= (levels[role] ?? 0));
  }

  /** Clear auth state without calling logout API. Used by interceptor to break 401 loops. */
  clearState(): void {
    this.clear();
  }

  private clear(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._activeOrgId.set(null);
    this._clearPersistedUser();
    try { localStorage.removeItem(ACTIVE_ORG_KEY); } catch { /* storage unavailable */ }
  }

  setActiveOrg(orgId: string): void {
    const memberships = this._user()?.memberships ?? [];
    if (memberships.some((m) => m.orgId === orgId)) {
      this._activeOrgId.set(orgId);
      try { localStorage.setItem(ACTIVE_ORG_KEY, orgId); } catch { /* storage unavailable */ }
    }
  }

  private _restoreActiveOrg(memberships: MembershipResponse[]): void {
    const saved = localStorage.getItem(ACTIVE_ORG_KEY);
    if (saved && memberships.some((m) => m.orgId === saved)) {
      this._activeOrgId.set(saved);
    }
    // else: activeOrgId computed falls back to memberships[0]
  }

  private _loadUser(): UserProfileResponse | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private _persistUser(user: UserProfileResponse): void {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* storage unavailable */ }
  }

  private _clearPersistedUser(): void {
    try { localStorage.removeItem(USER_KEY); } catch { /* storage unavailable */ }
  }
}
