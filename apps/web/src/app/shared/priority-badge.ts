import { Component, Input } from '@angular/core';

const PRIORITY_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
  LOW: { label: 'Low', icon: '\u2193', css: 'priority-low' },
  MEDIUM: { label: 'Medium', icon: '\u2194', css: 'priority-medium' },
  HIGH: { label: 'High', icon: '\u2191', css: 'priority-high' },
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
      gap: 4px;
      font-size: var(--text-xs);
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .priority-low { background: #f1f3f5; color: #495057; }
    .priority-medium { background: #fff4e6; color: #e8590c; }
    .priority-high { background: #fff4e6; color: #e8590c; }
    .priority-critical { background: #fff5f5; color: #c92a2a; }
  `],
})
export class PriorityBadge {
  @Input({ required: true }) priority!: string;
  readonly config = () => PRIORITY_CONFIG[this.priority] ?? PRIORITY_CONFIG['MEDIUM'];
}
