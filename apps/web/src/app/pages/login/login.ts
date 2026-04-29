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
      @if (error) {
        <div class="error">{{ error }}</div>
      }
      <form (ngSubmit)="onSubmit()">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" [(ngModel)]="email" name="email" required email />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" [(ngModel)]="password" name="password" required />
        </div>
        <button type="submit" [disabled]="submitting">
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
    .login-container { max-width: 400px; margin: 4rem auto; padding: 2rem; }
    .field { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.25rem; }
    input { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    .error { color: red; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.75rem; }

    .demo-users { margin-top: 2rem; border-top: 1px solid #e0e0e0; padding-top: 1.5rem; }
    .demo-users h3 { margin: 0 0 0.75rem; font-size: 0.875rem; color: #666; }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .demo-card {
      display: flex; flex-direction: column; align-items: flex-start;
      padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px;
      background: #fafafa; cursor: pointer; text-align: left; width: 100%;
      transition: background 0.15s, border-color 0.15s;
    }
    .demo-card:hover { background: #eef; border-color: #aac; }
    .demo-role { font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #555; }
    .demo-email { font-size: 0.8rem; color: #333; margin-top: 0.15rem; }
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
      this.router.navigate(['/']);
    } catch {
      this.error = 'Invalid email or password.';
    } finally {
      this.submitting = false;
    }
  }
}
