import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  template: `
    <div class="error-alert" role="alert">
      <span aria-hidden="true">&#9888;</span>
      <span>{{ message }}</span>
    </div>
  `,
  styles: [`
    .error-alert {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: var(--color-error-bg);
      color: var(--color-error);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      border: 1px solid #ffc9c9;
    }
  `],
})
export class ErrorAlert {
  @Input({ required: true }) message!: string;
}
