import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthState } from '../../auth/auth.state';
import { TasksApi, CreateTaskPayload } from '../../services/tasks.api';
import { DedupWarningPanel } from '../../shared/dedup-warning-panel';
import { ErrorAlert } from '../../shared/error-alert';
import { LoadingComponent } from '../../shared/loading';
import { PageHeader } from '../../shared/page-header';
import type { DedupCandidate } from '../../services/tasks.api';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeader, ErrorAlert, LoadingComponent, DedupWarningPanel],
  template: `
    <app-page-header heading="Create Task">
      <a routerLink="/tasks" class="btn btn-secondary">Cancel</a>
    </app-page-header>

    @if (submitting()) {
      <app-loading />
    } @else if (showDedupWarning()) {
      <app-dedup-warning-panel
        [candidates]="dedupCandidates"
        (merge)="onDedupMerge($event)"
        (skip)="onDedupSkip()"
        (createAnyway)="onDedupCreateAnyway($event)"
        (dismissed)="onDedupDismissed()"
      />
    } @else {
      <form class="form-card" (ngSubmit)="onSubmit()" #form="ngForm">
        @if (error()) {
          <app-error-alert [message]="error()!" />
        }

        <div class="form-group">
          <label for="title">Title <span aria-hidden="true">*</span></label>
          <input
            id="title"
            type="text"
            class="input"
            [(ngModel)]="title"
            name="title"
            required
            maxlength="300"
            #titleInput="ngModel"
            aria-required="true"
          />
          @if (titleInput.invalid && titleInput.touched) {
            <p class="field-error" role="alert">Title is required (max 300 characters).</p>
          }
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            class="input"
            rows="4"
            [(ngModel)]="description"
            name="description"
            maxlength="5000"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" class="input" [(ngModel)]="status" name="status">
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div class="form-group">
            <label for="priority">Priority</label>
            <select id="priority" class="input" [(ngModel)]="priority" name="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="category">Category</label>
            <input id="category" type="text" class="input" [(ngModel)]="category" name="category" maxlength="100" />
          </div>
          <div class="form-group">
            <label for="tags">Tags <span class="hint">(comma-separated)</span></label>
            <input id="tags" type="text" class="input" [(ngModel)]="tagsInput" name="tags" maxlength="500" placeholder="bug, auth, frontend" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="visibility">Visibility</label>
            <select id="visibility" class="input" [(ngModel)]="visibility" name="visibility">
              <option value="PUBLIC">Public</option>
              <option value="ASSIGNED_ONLY">Assigned Only</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="dueAt">Due Date</label>
            <input id="dueAt" type="datetime-local" class="input" [ngModel]="dueAt" (ngModelChange)="onDueDateChange($event)" name="dueAt" />
          </div>
          <div class="form-group">
            <label for="assigneeId">Assignee ID</label>
            <input id="assigneeId" type="text" class="input" [(ngModel)]="assigneeId" name="assigneeId" placeholder="UUID (optional)" />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="!title.trim()">Create Task</button>
          <a routerLink="/tasks" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    }
  `,
  styles: [`
    .form-card {
      max-width: 640px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      box-shadow: var(--shadow-xs);
    }
  `],
})
export class TaskCreatePage {
  private readonly tasksApi = inject(TasksApi);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  title = '';
  description = '';
  status = 'TODO';
  priority = 'MEDIUM';
  category = '';
  tagsInput = '';
  visibility = 'PUBLIC';
  dueAt = '';
  assigneeId = '';

  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly showDedupWarning = signal(false);
  readonly dedupCandidates = signal<DedupCandidate[]>([]);

  onDueDateChange(value: string): void {
    this.dueAt = value;
  }

  async onSubmit(): Promise<void> {
    if (!this.title.trim()) return;

    const user = this.authState.user();
    const orgId = this.authState.activeOrgId();
    if (!user || !orgId) {
      this.error.set('No organization found.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.tasksApi.checkDuplicates({
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      orgId,
    }).subscribe({
      next: (result) => {
        if (result.hasDuplicates) {
          this.dedupCandidates.set(result.candidates);
          this.showDedupWarning.set(true);
          this.submitting.set(false);
        } else {
          this.createTask();
        }
      },
      error: () => {
        this.createTask();
      },
    });
  }

  private buildPayload(decision?: string, rationale?: string): CreateTaskPayload {
    const orgId = this.authState.activeOrgId()!;
    const payload: CreateTaskPayload = {
      title: this.title.trim(),
      orgId,
      status: this.status,
      priority: this.priority,
      visibility: this.visibility,
    };

    if (this.description.trim()) payload.description = this.description.trim();
    if (this.category.trim()) payload.category = this.category.trim();
    if (this.tagsInput.trim()) {
      payload.tags = this.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
    if (this.dueAt) payload.dueAt = new Date(this.dueAt).toISOString();
    if (this.assigneeId.trim()) payload.assigneeId = this.assigneeId.trim();
    if (decision) payload.dedupDecision = decision as any;
    if (rationale) payload.dedupRationale = rationale;

    return payload;
  }

  private createTask(decision?: string, rationale?: string): void {
    const payload = this.buildPayload(decision, rationale);

    this.tasksApi.create(payload).subscribe({
      next: (task) => {
        this.router.navigate(['/tasks', task.id]);
      },
      error: (err) => {
        if (err?.status === 409 && err?.error?.candidates) {
          this.dedupCandidates.set(err.error.candidates);
          this.showDedupWarning.set(true);
          this.submitting.set(false);
          return;
        }
        const msg = err?.error?.message ?? err?.message ?? 'Failed to create task.';
        this.error.set(typeof msg === 'string' ? msg : 'Failed to create task.');
        this.submitting.set(false);
      },
    });
  }

  onDedupMerge(candidate: DedupCandidate): void {
    this.submitting.set(true);
    this.showDedupWarning.set(false);
    this.createTask('MERGE');
  }

  onDedupSkip(): void {
    this.showDedupWarning.set(false);
    this.submitting.set(false);
  }

  onDedupCreateAnyway(rationale: string): void {
    this.submitting.set(true);
    this.showDedupWarning.set(false);
    this.createTask('CREATE_ANYWAY', rationale);
  }

  onDedupDismissed(): void {
    this.showDedupWarning.set(false);
    this.submitting.set(false);
  }
}
