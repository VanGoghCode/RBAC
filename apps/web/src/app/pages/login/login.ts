import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthState } from '../../auth/auth.state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-container">
      <h1>Sign In</h1>
      <p class="login-subtitle">Task management workspace</p>
      @if (error) {
        <div class="error" role="alert" aria-live="assertive">{{ error }}</div>
      }
      <form (ngSubmit)="onSubmit()">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            [(ngModel)]="email"
            name="email"
            required
            email
            autocomplete="email"
            [attr.aria-invalid]="error ? true : null"
            aria-describedby="login-error"
          />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            [(ngModel)]="password"
            name="password"
            required
            autocomplete="current-password"
            [attr.aria-invalid]="error ? true : null"
            aria-describedby="login-error"
          />
        </div>
        <button type="submit" class="btn btn-primary login-btn" [disabled]="submitting">
          @if (submitting) { Signing in... } @else { Sign In }
        </button>
      </form>
      <div class="demo-users">
        <h3>Demo Accounts</h3>
        <div class="demo-grid">
          @for (u of demoUsers; track u.email) {
            <button type="button" class="demo-card" (click)="fill(u.email, u.password)">
              <span class="demo-role">{{ u.role }}</span>
              <span class="demo-email">{{ u.email }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 4rem auto;
      padding: var(--space-xl);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }
    h1 { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-xs); }
    .login-subtitle { color: var(--color-text-muted); font-size: var(--text-sm); margin-bottom: var(--space-lg); }
    .field { margin-bottom: var(--space-md); }
    label { display: block; margin-bottom: var(--space-xs); font-weight: 500; font-size: var(--text-sm); }
    input { width: 100%; padding: var(--space-sm) var(--space-md); box-sizing: border-box; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); }
    input:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
    .login-btn { width: 100%; padding: var(--space-sm) var(--space-md); margin-top: var(--space-sm); }
    .error {
      color: var(--color-error);
      background: var(--color-error-bg);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-md);
      font-size: var(--text-sm);
    }
    .demo-users { margin-top: var(--space-xl); border-top: 1px solid var(--color-border); padding-top: var(--space-lg); }
    .demo-users h3 { margin: 0 0 var(--space-sm); font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
    .demo-card {
      display: flex; flex-direction: column; align-items: flex-start;
      padding: var(--space-sm) var(--space-md); border: 1px solid var(--color-border); border-radius: var(--radius-md);
      background: var(--color-bg-muted); cursor: pointer; text-align: left; width: 100%;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .demo-card:hover { background: var(--color-primary-light); border-color: var(--color-primary); }
    .demo-role { font-weight: 600; font-size: var(--text-xs); text-transform: uppercase; color: var(--color-text-muted); }
    .demo-email { font-size: var(--text-xs); color: var(--color-text); margin-top: 2px; }
  `],
})
export class LoginPage {
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  email = '';
  password = '';
  error = '';
  submitting = false;

  readonly demoUsers = [
    { email: 'owner@acme.com', password: 'password123', role: 'Owner' },
    { email: 'admin@acme.com', password: 'password123', role: 'Admin' },
    { email: 'manager@acme.com', password: 'password123', role: 'Manager' },
    { email: 'member@acme.com', password: 'password123', role: 'Member' },
    { email: 'viewer@acme.com', password: 'password123', role: 'Viewer' },
  ];

  fill(email: string, password: string): void {
    this.email = email;
    this.password = password;
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }

    this.submitting = true;
    this.error = '';

    try {
      await this.authState.login(this.email, this.password);
      const returnUrl = sessionStorage.getItem('returnUrl') ?? '/';
      sessionStorage.removeItem('returnUrl');
      this.router.navigate([returnUrl]);
    } catch {
      this.error = 'Invalid email or password.';
    } finally {
      this.submitting = false;
    }
  }
}
