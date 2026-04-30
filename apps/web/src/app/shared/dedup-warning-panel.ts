import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DedupCandidate } from '../services/tasks.api';

@Component({
  selector: 'app-dedup-warning-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="dialog-backdrop" role="presentation">
      <div
        class="dialog dedup-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dedup-title"
        aria-describedby="dedup-desc"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h3 id="dedup-title" class="dialog-title">Similar Tasks Found</h3>
        <p id="dedup-desc" class="dialog-message">
          The following tasks look similar to what you are creating. What would you like to do?
        </p>

        <ul class="candidate-list" role="list">
          @for (c of candidates(); track c.taskId) {
            <li class="candidate-card" tabindex="0" role="listitem">
              <div class="candidate-header">
                <strong class="candidate-title">{{ c.title }}</strong>
                <span class="similarity-badge">{{ (c.similarity * 100) | number : '1.0-0' }}% match</span>
              </div>
              <div class="candidate-meta">
                <span class="meta-item">{{ c.status }}</span>
                <span class="meta-item">{{ c.priority }}</span>
                @if (c.assigneeName) {
                  <span class="meta-item">{{ c.assigneeName }}</span>
                }
              </div>
              <a [routerLink]="['/tasks', c.taskId]" class="candidate-link" target="_blank">
                View task
              </a>
            </li>
          }
        </ul>

        @if (showRationale()) {
          <div class="form-group">
            <label for="rationale">Reason for creating anyway</label>
            <textarea
              id="rationale"
              class="input rationale-input"
              rows="2"
              [ngModel]="rationale()"
              (ngModelChange)="rationale.set($event)"
              maxlength="500"
            ></textarea>
          </div>
        }

        <div class="dialog-actions dedup-actions">
          <button class="btn btn-secondary" type="button" (click)="dismissed.emit()">Cancel</button>
          <button class="btn btn-ghost" type="button" (click)="skip.emit()">Skip</button>
          <button class="btn btn-warning" type="button" (click)="merge.emit(topCandidate())">
            Merge into existing
          </button>
          <button class="btn btn-primary" type="button" (click)="toggleRationale()">
            Create anyway
          </button>
          @if (showRationale()) {
            <button
              class="btn btn-primary"
              type="button"
              [disabled]="!rationale().trim()"
              (click)="createAnyway.emit(rationale().trim())"
            >
              Confirm create
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dedup-dialog {
      max-width: 560px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .dialog {
      background: var(--color-bg);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      width: 90%;
      box-shadow: var(--shadow-lg);
    }
    .dialog-title { font-size: var(--text-base); font-weight: 700; margin-bottom: var(--space-sm); }
    .dialog-message { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-md); }
    .candidate-list {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-md) 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .candidate-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      cursor: default;
    }
    .candidate-card:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    .candidate-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-sm);
      margin-bottom: var(--space-xs);
    }
    .candidate-title { font-weight: 600; font-size: var(--text-sm); flex: 1; }
    .similarity-badge {
      font-size: var(--text-xs);
      background: var(--color-warning-bg, #fef3c7);
      color: var(--color-warning-text, #92400e);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      font-weight: 500;
    }
    .candidate-meta {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-xs);
    }
    .meta-item {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
    }
    .candidate-link {
      font-size: var(--text-xs);
      color: var(--color-primary);
      text-decoration: none;
    }
    .candidate-link:hover { text-decoration: underline; }
    .form-group { margin-bottom: var(--space-md); }
    .form-group label {
      display: block;
      margin-bottom: var(--space-xs);
      font-size: var(--text-sm);
      font-weight: 500;
    }
    .rationale-input {
      width: 100%;
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      resize: vertical;
    }
    .dedup-actions {
      flex-wrap: wrap;
    }
    .btn-warning {
      background: var(--color-warning-bg, #fef3c7);
      color: var(--color-warning-text, #92400e);
      border: 1px solid var(--color-warning-border, #f59e0b);
    }
    .btn-warning:hover {
      background: var(--color-warning-hover, #fde68a);
    }
    .btn-ghost {
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
    }
    .btn-ghost:hover {
      background: var(--color-bg-hover, #f3f4f6);
    }
  `],
})
export class DedupWarningPanel {
  @Input({ required: true }) candidates!: () => DedupCandidate[];
  @Output() readonly merge = new EventEmitter<DedupCandidate>();
  @Output() readonly skip = new EventEmitter<void>();
  @Output() readonly createAnyway = new EventEmitter<string>();
  @Output() readonly dismissed = new EventEmitter<void>();

  showRationale = signal(false);
  rationale = signal('');

  topCandidate(): DedupCandidate {
    return this.candidates()[0];
  }

  toggleRationale(): void {
    this.showRationale.set(!this.showRationale());
  }
}
