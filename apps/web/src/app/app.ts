import { Component, inject, signal } from '@angular/core';
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

  get displayName(): string {
    return this.authState.user()?.name ?? 'User';
  }

  get orgName(): string {
    const memberships = this.authState.user()?.memberships ?? [];
    return memberships.length > 0 ? memberships[0].orgName : '';
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    setTimeout(() => this.userMenuOpen.set(false), 150);
  }

  async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authState.logout();
  }
}
