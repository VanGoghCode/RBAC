import { Component } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div class="loading" role="status" aria-label="Loading">
      <div class="spinner" aria-hidden="true"></div>
      <span class="sr-only">Loading...</span>
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-xl);
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingComponent {}
