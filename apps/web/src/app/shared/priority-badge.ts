import { Component, Input } from '@angular/core';

const PRIORITY_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
  LOW:      { label: 'Low',      icon: '\u2193', css: 'priority-low' },
  MEDIUM:   { label: 'Medium',   icon: '\u2194', css: 'priority-medium' },
  HIGH:     { label: 'High',     icon: '\u2191', css: 'priority-high' },
  CRITICAL: { label: 'Critical', icon: '\u26A0', css: 'priority-critical' },
};

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  template: `
    <span class="badge {{ config().css }}" [title]="config().label">
      <span aria-hidden="true">{{ config().icon }}</span>
      {{ config().label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3xs);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      padding: var(--space-3xs) var(--space-sm);
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .priority-low {
      background: var(--color-priority-low-bg);
      color: var(--color-priority-low);
    }
    .priority-medium {
      background: var(--color-priority-medium-bg);
      color: var(--color-priority-medium);
    }
    .priority-high {
      background: var(--color-priority-high-bg);
      color: var(--color-priority-high);
    }
    .priority-critical {
      background: var(--color-priority-critical-bg);
      color: var(--color-priority-critical);
    }
  `],
})
export class PriorityBadge {
  @Input({ required: true }) priority!: string;
  readonly config = () => PRIORITY_CONFIG[this.priority] ?? PRIORITY_CONFIG['MEDIUM'];
}
