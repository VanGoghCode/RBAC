import { Component, Input } from '@angular/core';

const STATUS_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
  TODO:        { label: 'To Do',       icon: '\u25CB', css: 'status-todo' },
  IN_PROGRESS: { label: 'In Progress', icon: '\u25D0', css: 'status-in-progress' },
  IN_REVIEW:   { label: 'In Review',   icon: '\u25C9', css: 'status-in-review' },
  BLOCKED:     { label: 'Blocked',     icon: '\u2716', css: 'status-blocked' },
  DONE:        { label: 'Done',        icon: '\u2713', css: 'status-done' },
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
      gap: var(--space-3xs);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      padding: var(--space-3xs) var(--space-sm);
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .status-todo {
      background: var(--color-status-todo-bg);
      color: var(--color-status-todo);
    }
    .status-in-progress {
      background: var(--color-status-in-progress-bg);
      color: var(--color-status-in-progress);
    }
    .status-in-review {
      background: var(--color-status-in-review-bg);
      color: var(--color-status-in-review);
    }
    .status-blocked {
      background: var(--color-status-blocked-bg);
      color: var(--color-status-blocked);
    }
    .status-done {
      background: var(--color-status-done-bg);
      color: var(--color-status-done);
    }
  `],
})
export class StatusBadge {
  @Input({ required: true }) status!: string;
  readonly config = () => STATUS_CONFIG[this.status] ?? STATUS_CONFIG['TODO'];
}
