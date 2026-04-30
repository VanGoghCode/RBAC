import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ heading }}</h1>
        @if (subtitle) {
          <p class="page-header-subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="page-header-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-sm);
      margin-bottom: var(--space-xl);
    }
    .page-header-text {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
      min-width: 0;
    }
    h1 {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      margin: 0;
      color: var(--color-text);
      letter-spacing: var(--tracking-tight);
      line-height: var(--leading-tight);
    }
    .page-header-subtitle {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      margin: 0;
      line-height: var(--leading-normal);
    }
    .page-header-actions {
      margin-left: auto;
      display: flex;
      gap: var(--space-sm);
      align-items: center;
    }
  `],
})
export class PageHeader {
  @Input({ required: true }) heading!: string;
  @Input() subtitle = '';
}
