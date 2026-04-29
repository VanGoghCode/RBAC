import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from './auth.api';
import type { UserProfileResponse, OrgRole } from '@task-ai/shared/types';

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<UserProfileResponse | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly accessToken = this._accessToken.asReadonly();

  login(email: string, password: string) {
    return new Promise<void>((resolve, reject) => {
      this.api.login(email, password).subscribe({
        next: (res) => {
          this._accessToken.set(res.accessToken);
          this._user.set(res.user);
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  refreshOnLoad(): Promise<void> {
    return new Promise((resolve) => {
      this.api.refresh().subscribe({
        next: (res) => {
          this._accessToken.set(res.accessToken);
          this.api.getProfile().subscribe({
            next: (profile) => {
              this._user.set(profile);
              resolve();
            },
            error: () => {
              this.clear();
              resolve();
            },
          });
        },
        error: () => {
          this.clear();
          resolve();
        },
      });
    });
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

  private clear(): void {
    this._accessToken.set(null);
    this._user.set(null);
  }
}
