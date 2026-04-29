import { Component, inject } from '@angular/core';
import { AuthState } from '../../auth/auth.state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1>Dashboard</h1>
    <p>Welcome, {{ authState.user()?.name ?? 'User' }}</p>
    <button (click)="authState.logout()">Sign Out</button>
  `,
})
export class DashboardPage {
  readonly authState = inject(AuthState);
}
