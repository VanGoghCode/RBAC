import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  template: `
    <div class="error-alert" role="alert">
      <span class="error-alert-icon" aria-hidden="true">&#9888;</span>
      <span class="error-alert-text">{{ message }}</span>
    </div>
  `,
  styles: [`
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
      line-height: var(--leading-normal);
    }
    .error-alert-icon {
      flex-shrink: 0;
      font-size: var(--text-base);
      line-height: var(--leading-normal);
    }
    .error-alert-text {
      flex: 1;
    }
  `],
})
export class ErrorAlert {
  @Input({ required: true }) message!: string;
}
