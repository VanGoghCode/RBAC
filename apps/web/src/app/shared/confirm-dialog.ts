import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="dialog-backdrop" role="presentation">
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="'dialog-title-' + id"
        [attr.aria-describedby]="'dialog-desc-' + id"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h3 [id]="'dialog-title-' + id" class="dialog-title">{{ title }}</h3>
        <p [id]="'dialog-desc-' + id" class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="cancel()" type="button">Cancel</button>
          <button class="btn btn-danger" (click)="confirm()" type="button">{{ confirmLabel }}</button>
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
    .dialog {
      background: var(--color-bg);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      max-width: 400px;
      width: 90%;
      box-shadow: var(--shadow-lg);
    }
    .dialog-title { font-size: var(--text-base); font-weight: 700; margin-bottom: var(--space-sm); }
    .dialog-message { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-lg); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); }
  `],
})
export class ConfirmDialog {
  private static counter = 0;
  readonly id = ++ConfirmDialog.counter;

  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
  @Input() confirmLabel = 'Confirm';
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  confirm(): void { this.confirmed.emit(); }
  cancel(): void { this.cancelled.emit(); }
  onBackdropKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.cancel();
  }
}
