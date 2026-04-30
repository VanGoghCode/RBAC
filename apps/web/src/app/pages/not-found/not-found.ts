import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <div class="not-found-content">
        <span class="not-found-code" aria-hidden="true">404</span>
        <h1 class="not-found-title">Page not found</h1>
        <p class="not-found-desc">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div class="not-found-actions">
          <a routerLink="/dashboard" class="btn btn-primary">Go to Dashboard</a>
          <a routerLink="/tasks" class="btn btn-secondary">View Tasks</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xl);
    }
    .not-found-content {
      text-align: center;
      max-width: 480px;
    }
    .not-found-code {
      display: block;
      font-size: var(--text-5xl);
      font-weight: var(--font-bold);
      color: var(--color-outline-variant);
      line-height: 1;
      margin-bottom: var(--space-md);
      letter-spacing: -0.04em;
    }
    .not-found-title {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }
    .not-found-desc {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-bottom: var(--space-xl);
      line-height: var(--leading-relaxed);
    }
    .not-found-actions {
      display: flex;
      justify-content: center;
      gap: var(--space-sm);
    }
  `],
})
export class NotFoundPage {}
