import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthState } from '../../auth/auth.state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <span class="login-brand">TaskAI</span>
          <h1>Sign In</h1>
          <p class="login-subtitle">Task management workspace</p>
        </div>

        @if (error) {
          <div class="error-alert" role="alert" aria-live="assertive">
            <span class="error-alert-icon" aria-hidden="true">&#9888;</span>
            <span>{{ error }}</span>
          </div>
        }

        <form class="login-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              class="input"
              [(ngModel)]="email"
              name="email"
              required
              email
              autocomplete="email"
              [attr.aria-invalid]="error ? true : null"
              aria-describedby="login-error"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              class="input"
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

        <div class="demo-section">
          <h3 class="demo-heading">Demo Accounts</h3>
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
    }
    .login-page {
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      background: var(--color-background);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-2xl);
      padding: var(--space-xl);
      box-shadow: var(--shadow-lg);
    }
    .login-header {
      text-align: center;
      margin-bottom: var(--space-lg);
    }
    .login-brand {
      display: block;
      font-weight: var(--font-bold);
      font-size: var(--text-xl);
      color: var(--color-primary);
      margin-bottom: var(--space-sm);
      letter-spacing: var(--tracking-tight);
    }
    h1 {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-2xs);
    }
    .login-subtitle {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .error-alert {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      background: var(--color-error-bg);
      color: var(--color-on-error-container);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-lg);
      font-size: var(--text-sm);
      border: 1px solid var(--color-error-container);
      margin-bottom: var(--space-md);
    }
    .error-alert-icon {
      flex-shrink: 0;
    }
    .login-form {
      margin-bottom: var(--space-lg);
    }
    .login-form .form-group {
      margin-bottom: var(--space-md);
    }
    .login-form .form-group label {
      display: block;
      margin-bottom: var(--space-2xs);
      font-weight: var(--font-medium);
      font-size: var(--text-sm);
      color: var(--color-text);
    }
    .login-btn {
      width: 100%;
      margin-top: var(--space-sm);
    }
    .demo-section {
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-lg);
    }
    .demo-heading {
      margin: 0 0 var(--space-sm);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
      font-weight: var(--font-semibold);
    }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xs);
    }
    .demo-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-low);
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .demo-card:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
    .demo-role {
      font-weight: var(--font-semibold);
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-muted);
      letter-spacing: var(--tracking-wider);
    }
    .demo-email {
      font-size: var(--text-xs);
      color: var(--color-text);
      margin-top: var(--space-3xs);
    }
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
      const returnUrl = localStorage.getItem('returnUrl') ?? '/';
      localStorage.removeItem('returnUrl');
      this.router.navigate([returnUrl]);
    } catch {
      this.error = 'Invalid email or password.';
    } finally {
      this.submitting = false;
    }
  }
}
