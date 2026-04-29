import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state" role="status">
      <p class="empty-icon" aria-hidden="true">{{ icon }}</p>
      <p class="empty-title">{{ title }}</p>
      @if (description) {
        <p class="empty-desc">{{ description }}</p>
      }
      <div class="empty-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: var(--space-2xl);
      color: var(--color-text-muted);
    }
    .empty-icon { font-size: 2rem; margin-bottom: var(--space-sm); }
    .empty-title { font-weight: 600; color: var(--color-text); margin-bottom: var(--space-xs); }
    .empty-desc { font-size: var(--text-sm); margin-bottom: var(--space-md); }
    .empty-actions { display: flex; justify-content: center; gap: var(--space-sm); }
  `],
})
export class EmptyState {
  @Input({ required: true }) title!: string;
  @Input() icon = '\uD83D\uDDC3';
  @Input() description = '';
}
