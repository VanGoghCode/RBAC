import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthState } from './auth/auth.state';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly authState = inject(AuthState);
  readonly sidebarOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly orgMenuOpen = signal(false);

  readonly memberships = computed(() => this.authState.user()?.memberships ?? []);
  readonly activeOrgName = computed(() => this.authState.activeOrg()?.orgName ?? '');

  get displayName(): string {
    return this.authState.user()?.name ?? 'User';
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  toggleOrgMenu(): void {
    this.orgMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    setTimeout(() => this.userMenuOpen.set(false), 150);
  }

  closeOrgMenu(): void {
    setTimeout(() => this.orgMenuOpen.set(false), 150);
  }

  switchOrg(orgId: string): void {
    this.authState.setActiveOrg(orgId);
    this.orgMenuOpen.set(false);
  }

  async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authState.logout();
  }
}
