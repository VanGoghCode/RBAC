import { Component, Input } from '@angular/core';

const STATUS_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
  TODO: { label: 'To Do', icon: '\u25CB', css: 'status-todo' },
  IN_PROGRESS: { label: 'In Progress', icon: '\u25D0', css: 'status-in-progress' },
  IN_REVIEW: { label: 'In Review', icon: '\u25C9', css: 'status-in-review' },
  BLOCKED: { label: 'Blocked', icon: '\u2716', css: 'status-blocked' },
  DONE: { label: 'Done', icon: '\u2713', css: 'status-done' },
};

@Component({
  selector: 'app-status-badge',
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
    .status-todo { background: #f1f3f5; color: #495057; }
    .status-in-progress { background: #edf2ff; color: #4c6ef5; }
    .status-in-review { background: #f8f0fc; color: #ae3ec9; }
    .status-blocked { background: #fff5f5; color: #e03131; }
    .status-done { background: #ebfbee; color: #2f9e44; }
  `],
})
export class StatusBadge {
  @Input({ required: true }) status!: string;
  readonly config = () => STATUS_CONFIG[this.status] ?? STATUS_CONFIG['TODO'];
}
