import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>{{ heading }}</h1>
      @if (subtitle) {
        <p class="subtitle">{{ subtitle }}</p>
      }
      <div class="actions">
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
      margin-bottom: var(--space-lg);
    }
    h1 {
      font-size: var(--text-xl);
      font-weight: 700;
      margin: 0;
    }
    .subtitle {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      margin: 0;
      flex-basis: 100%;
    }
    .actions {
      margin-left: auto;
      display: flex;
      gap: var(--space-sm);
    }
  `],
})
export class PageHeader {
  @Input({ required: true }) heading!: string;
  @Input() subtitle = '';
}
