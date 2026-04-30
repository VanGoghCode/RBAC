import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state" role="status">
      <div class="empty-state-icon" aria-hidden="true">{{ icon }}</div>
      <p class="empty-state-title">{{ title }}</p>
      @if (description) {
        <p class="empty-state-desc">{{ description }}</p>
      }
      <div class="empty-state-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: var(--space-3xl) var(--space-lg);
      color: var(--color-text-muted);
    }
    .empty-state-icon {
      font-size: var(--text-4xl);
      margin-bottom: var(--space-md);
      opacity: 0.6;
    }
    .empty-state-title {
      font-weight: var(--font-semibold);
      font-size: var(--text-lg);
      color: var(--color-text);
      margin-bottom: var(--space-2xs);
    }
    .empty-state-desc {
      font-size: var(--text-sm);
      margin-bottom: var(--space-lg);
      color: var(--color-text-muted);
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    .empty-state-actions {
      display: flex;
      justify-content: center;
      gap: var(--space-sm);
    }
  `],
})
export class EmptyState {
  @Input({ required: true }) title!: string;
  @Input() icon = '\uD83D\uDDC3';
  @Input() description = '';
}
