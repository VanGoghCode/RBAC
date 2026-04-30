import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthState } from '../../auth/auth.state';
import { TasksApi, TaskItem, UpdateTaskPayload } from '../../services/tasks.api';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { ErrorAlert } from '../../shared/error-alert';
import { LoadingComponent } from '../../shared/loading';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'app-task-edit',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeader, ErrorAlert, LoadingComponent, ConfirmDialog],
  template: `
    <app-page-header heading="Edit Task">
      <a [routerLink]="['/tasks', taskId]" class="btn btn-secondary">Cancel</a>
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-alert [message]="error()!" />
    } @else if (task()) {
      <form class="form-card" (ngSubmit)="onSubmit()">
        @if (saveError()) {
          <app-error-alert [message]="saveError()!" />
        }

        <div class="form-group">
          <label for="title">Title <span aria-hidden="true">*</span></label>
          <input id="title" type="text" class="input" [(ngModel)]="title" name="title" required maxlength="300" aria-required="true" />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" class="input" rows="4" [(ngModel)]="description" name="description" maxlength="5000"></textarea>
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
            <input id="dueAt" type="datetime-local" class="input" [ngModel]="dueAt" (ngModelChange)="dueAt = $event" name="dueAt" />
          </div>
          <div class="form-group">
            <label for="assigneeId">Assignee ID</label>
            <input id="assigneeId" type="text" class="input" [(ngModel)]="assigneeId" name="assigneeId" placeholder="UUID (optional)" />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="submitting()">
            @if (submitting()) { Saving... } @else { Save Changes }
          </button>
          <button type="button" class="btn btn-danger" (click)="showDelete.set(true)">Delete Task</button>
          <a [routerLink]="['/tasks', taskId]" class="btn btn-secondary">Cancel</a>
        </div>
      </form>

      @if (showDelete()) {
        <app-confirm-dialog
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          (confirmed)="deleteTask()"
          (cancelled)="showDelete.set(false)"
        />
      }
    }
  `,
  styles: [`
    .form-card {
      max-width: 640px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
    }
    .form-group { margin-bottom: var(--space-md); }
    .form-group label { display: block; margin-bottom: var(--space-xs); font-weight: 500; font-size: var(--text-sm); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
    .form-actions { display: flex; gap: var(--space-sm); margin-top: var(--space-lg); }
    .hint { font-weight: 400; color: var(--color-text-secondary); }
    textarea.input { resize: vertical; }
  `],
})
export class TaskEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasksApi = inject(TasksApi);
  private readonly authState = inject(AuthState);

  taskId = '';
  readonly task = signal<TaskItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly showDelete = signal(false);

  title = '';
  description = '';
  status = 'TODO';
  priority = 'MEDIUM';
  category = '';
  tagsInput = '';
  visibility = 'PUBLIC';
  dueAt = '';
  assigneeId = '';

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.taskId) {
      this.error.set('Task not found.');
      this.loading.set(false);
      return;
    }
    this.tasksApi.getById(this.taskId).subscribe({
      next: (t) => {
        this.task.set(t);
        this.title = t.title;
        this.description = t.description ?? '';
        this.status = t.status;
        this.priority = t.priority;
        this.category = t.category ?? '';
        this.tagsInput = (t.tags ?? []).join(', ');
        this.visibility = t.visibility;
        this.assigneeId = t.assigneeId ?? '';
        if (t.dueAt) {
          const d = new Date(t.dueAt);
          this.dueAt = d.toISOString().slice(0, 16);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Task not found.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (!this.title.trim()) return;
    this.submitting.set(true);
    this.saveError.set(null);

    const payload: UpdateTaskPayload = {
      title: this.title.trim(),
      description: this.description.trim() || null,
      status: this.status,
      priority: this.priority,
      category: this.category.trim() || null,
      tags: this.tagsInput.trim()
        ? this.tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
        : [],
      visibility: this.visibility,
    };

    if (this.dueAt) {
      payload.dueAt = new Date(this.dueAt).toISOString();
    } else {
      payload.dueAt = null;
    }

    if (this.assigneeId.trim()) {
      payload.assigneeId = this.assigneeId.trim();
    } else {
      payload.assigneeId = null;
    }

    this.tasksApi.update(this.taskId, payload).subscribe({
      next: () => {
        this.router.navigate(['/tasks', this.taskId]);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Failed to update task.';
        this.saveError.set(typeof msg === 'string' ? msg : 'Failed to update task.');
        this.submitting.set(false);
      },
    });
  }

  deleteTask(): void {
    this.showDelete.set(false);
    this.tasksApi.delete(this.taskId).subscribe({
      next: () => this.router.navigate(['/tasks']),
    });
  }
}
