import { DatePipe } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { TasksApi, TaskItem, ActivityItem } from '../../services/tasks.api';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { ErrorAlert } from '../../shared/error-alert';
import { LoadingComponent } from '../../shared/loading';
import { PageHeader } from '../../shared/page-header';
import { PriorityBadge } from '../../shared/priority-badge';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, PageHeader, StatusBadge, PriorityBadge, LoadingComponent, ErrorAlert, ConfirmDialog],
  template: `
    <app-page-header heading="Task Details">
      <a routerLink="/tasks" class="btn btn-secondary">Back</a>
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-alert [message]="error()!" />
    } @else if (task()) {
      <div class="detail-grid">
        <div class="detail-main">
          <div class="card detail-card">
            <h2 class="detail-title">{{ task()!.title }}</h2>
            @if (task()!.description) {
              <p class="detail-desc">{{ task()!.description }}</p>
            } @else {
              <p class="detail-desc text-muted">No description</p>
            }

            <div class="detail-fields">
              <div class="field-row">
                <span class="field-label">Status</span>
                <app-status-badge [status]="task()!.status" />
              </div>
              <div class="field-row">
                <span class="field-label">Priority</span>
                <app-priority-badge [priority]="task()!.priority" />
              </div>
              @if (task()!.category) {
                <div class="field-row">
                  <span class="field-label">Category</span>
                  <span class="field-value">{{ task()!.category }}</span>
                </div>
              }
              <div class="field-row">
                <span class="field-label">Visibility</span>
                <span class="field-value">{{ task()!.visibility }}</span>
              </div>
              @if (task()!.dueAt) {
                <div class="field-row">
                  <span class="field-label">Due</span>
                  <span class="field-value" [class.overdue]="isOverdue">{{ task()!.dueAt | date:'mediumDate' }}</span>
                </div>
              }
              <div class="field-row">
                <span class="field-label">Created</span>
                <span class="field-value">{{ task()!.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>

            @if (canEdit()) {
              <div class="detail-actions">
                <a [routerLink]="['/tasks', taskId, 'edit']" class="btn btn-primary">Edit</a>
                <button class="btn btn-danger" (click)="showDelete.set(true)">Delete</button>
              </div>
            }
          </div>
        </div>

        <div class="detail-sidebar">
          <!-- Activity Timeline -->
          <div class="card">
            <h3 class="card-heading">Activity</h3>
            @if (activities().length === 0) {
              <p class="text-muted text-sm">No activity yet.</p>
            } @else {
              <ul class="activity-timeline">
                @for (act of activities(); track act.id) {
                  <li class="activity-item">
                    <div class="activity-dot"></div>
                    <div class="activity-content">
                      <span class="activity-actor">{{ act.actorName }}</span>
                      <span class="activity-action">{{ describeActivity(act) }}</span>
                      <time class="activity-time">{{ act.createdAt | date:'shortDate' }}</time>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Comments -->
          <div class="card">
            <h3 class="card-heading">Add Comment</h3>
            @if (canComment()) {
              <form class="comment-form" (ngSubmit)="submitComment()">
                <label for="comment-input" class="sr-only">Comment</label>
                <textarea
                  id="comment-input"
                  class="input"
                  rows="3"
                  [(ngModel)]="commentText"
                  name="comment"
                  placeholder="Write a comment..."
                  [maxlength]="5000"
                ></textarea>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="!commentText().trim() || submittingComment()">
                  @if (submittingComment()) { Posting... } @else { Post Comment }
                </button>
              </form>
            } @else {
              <p class="text-muted text-sm">Viewers cannot comment.</p>
            }
          </div>
        </div>
      </div>

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
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-lg);
    }

    @media (max-width: 900px) {
      .detail-grid { grid-template-columns: 1fr; }
    }

    .detail-card {
      margin-bottom: var(--space-md);
    }
    .detail-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      margin-bottom: var(--space-sm);
      color: var(--color-text);
    }
    .detail-desc {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-lg);
      white-space: pre-wrap;
      line-height: var(--leading-relaxed);
    }
    .detail-fields {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .field-row {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      font-size: var(--text-sm);
    }
    .field-label {
      color: var(--color-text-muted);
      min-width: 100px;
      font-weight: var(--font-medium);
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
    }
    .field-value {
      color: var(--color-text);
    }
    .detail-actions {
      display: flex;
      gap: var(--space-sm);
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--color-border);
    }
    .card-heading {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      margin-bottom: var(--space-md);
      color: var(--color-text);
    }

    /* Activity Timeline */
    .activity-timeline {
      list-style: none;
      padding: 0;
      margin: 0;
      position: relative;
    }
    .activity-item {
      display: flex;
      gap: var(--space-sm);
      padding: var(--space-sm) 0;
      position: relative;
    }
    .activity-item:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--color-outline-variant);
      flex-shrink: 0;
      margin-top: 6px;
    }
    .activity-content {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3xs);
      align-items: baseline;
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
    }
    .activity-actor {
      font-weight: var(--font-semibold);
      color: var(--color-text);
    }
    .activity-action {
      color: var(--color-text-secondary);
    }
    .activity-time {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
    }

    /* Comment form */
    .comment-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .comment-form textarea {
      width: 100%;
    }
  `],
})
export class TaskDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksApi = inject(TasksApi);
  private readonly authState = inject(AuthState);
  private subs: Subscription[] = [];

  taskId = '';
  readonly task = signal<TaskItem | null>(null);
  readonly activities = signal<ActivityItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly commentText = signal('');
  readonly submittingComment = signal(false);
  readonly showDelete = signal(false);

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.taskId) {
      this.error.set('Task not found.');
      this.loading.set(false);
      return;
    }
    this.loadTask();
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  get isOverdue(): boolean {
    const t = this.task();
    if (!t || !t.dueAt || t.status === 'DONE') return false;
    return new Date(t.dueAt) < new Date();
  }

  canEdit(): boolean {
    const user = this.authState.user();
    const t = this.task();
    if (!user || !t) return false;
    const role = user.memberships.find((m) => m.orgId === t.orgId)?.role;
    if (!role) return false;
    if (role === 'owner' || role === 'admin' || role === 'manager') return true;
    if (role === 'member') return t.createdById === user.id || t.assigneeId === user.id;
    return false;
  }

  canComment(): boolean {
    const user = this.authState.user();
    const t = this.task();
    if (!user || !t) return false;
    return user.memberships.some((m) => m.orgId === t.orgId && m.role !== 'viewer');
  }

  describeActivity(act: ActivityItem): string {
    switch (act.type) {
      case 'STATUS_CHANGE': return `changed status${act.fromValue ? ` from ${act.fromValue}` : ''} to ${act.toValue ?? 'unknown'}`;
      case 'PRIORITY_CHANGE': return `changed priority to ${act.toValue ?? 'unknown'}`;
      case 'ASSIGNMENT_CHANGE': return `changed assignee`;
      case 'DUE_DATE_CHANGE': return `changed due date`;
      case 'COMMENT': return `commented: "${(act.comment ?? '').slice(0, 80)}${(act.comment ?? '').length > 80 ? '...' : ''}"`;
      default: return act.type;
    }
  }

  submitComment(): void {
    const text = this.commentText().trim();
    if (!text) return;
    this.submittingComment.set(true);
    const sub = this.tasksApi.addComment(this.taskId, text).subscribe({
      next: () => {
        this.commentText.set('');
        this.submittingComment.set(false);
        this.loadActivities();
      },
      error: () => {
        this.submittingComment.set(false);
      },
    });
    this.subs.push(sub);
  }

  deleteTask(): void {
    this.showDelete.set(false);
    const sub = this.tasksApi.delete(this.taskId).subscribe({
      next: () => {
        window.history.back();
      },
    });
    this.subs.push(sub);
  }

  private loadTask(): void {
    const sub = this.tasksApi.getById(this.taskId).subscribe({
      next: (t) => {
        this.task.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Task not found.');
        this.loading.set(false);
      },
    });
    this.subs.push(sub);
  }

  private loadActivities(): void {
    const sub = this.tasksApi.getActivities(this.taskId, { limit: 20, order: 'desc' }).subscribe({
      next: (result) => this.activities.set(result.items),
    });
    this.subs.push(sub);
  }
}
