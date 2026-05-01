import { DatePipe } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { TasksApi, TaskItem } from '../../services/tasks.api';
import { EmptyState } from '../../shared/empty-state';
import { ErrorAlert } from '../../shared/error-alert';
import { LoadingComponent } from '../../shared/loading';
import { PageHeader } from '../../shared/page-header';
import { PriorityBadge } from '../../shared/priority-badge';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeader, StatusBadge, PriorityBadge, EmptyState, LoadingComponent, ErrorAlert],
  template: `
    <app-page-header heading="Dashboard" [subtitle]="'Welcome back, ' + displayName">
      @if (canCreate) {
        <a routerLink="/tasks/new" class="btn btn-primary">New Task</a>
      }
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-alert [message]="error()!" />
    } @else {
      <div class="summary-grid">
        <div class="summary-card summary-open">
          <span class="summary-value">{{ openCount() }}</span>
          <span class="summary-label">Open</span>
        </div>
        <div class="summary-card summary-blocked">
          <span class="summary-value">{{ blockedCount() }}</span>
          <span class="summary-label">Blocked</span>
        </div>
        <div class="summary-card summary-overdue">
          <span class="summary-value">{{ overdueCount() }}</span>
          <span class="summary-label">Overdue</span>
        </div>
        <div class="summary-card summary-done">
          <span class="summary-value">{{ doneCount() }}</span>
          <span class="summary-label">Completed</span>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Recent Tasks</h2>
        @if (hasMore()) {
          <a routerLink="/tasks" class="section-link">View all</a>
        }
      </div>

      @if (tasks().length === 0) {
        <app-empty-state title="No tasks yet" icon="\uD83D\uDCCB" description="Create your first task to get started.">
          <a routerLink="/tasks/new" class="btn btn-primary">Create Task</a>
        </app-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              @for (task of tasks(); track task.id) {
                <tr>
                  <td><a [routerLink]="['/tasks', task.id]">{{ task.title }}</a></td>
                  <td><app-status-badge [status]="task.status" /></td>
                  <td><app-priority-badge [priority]="task.priority" /></td>
                  <td>
                    @if (task.dueAt) {
                      <span [class.overdue]="isOverdue(task)">{{ task.dueAt | date:'shortDate' }}</span>
                    } @else {
                      <span class="text-muted">&mdash;</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      padding: var(--space-lg) 0;
      margin-top: var(--space-lg);
      margin-bottom: var(--space-lg);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }

    @media (max-width: 768px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .summary-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      text-align: center;
      box-shadow: var(--shadow-xs);
      border-top: 3px solid var(--color-primary);
      transition: box-shadow var(--transition-fast);
    }
    .summary-card:hover {
      box-shadow: var(--shadow-sm);
    }
    .summary-open { border-top-color: var(--color-primary); }
    .summary-blocked { border-top-color: var(--color-status-blocked); }
    .summary-overdue { border-top-color: var(--color-tertiary); }
    .summary-done { border-top-color: var(--color-status-done); }

    .summary-value {
      display: block;
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--color-text);
      letter-spacing: var(--tracking-tight);
      line-height: 1;
      margin-bottom: var(--space-xs);
    }
    .summary-label {
      display: block;
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-md);
    }
    .section-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--color-text);
      margin: 0;
    }
    .section-link {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--color-primary);
    }
  `],
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly tasksApi = inject(TasksApi);
  private readonly authState = inject(AuthState);
  private sub?: Subscription;

  readonly tasks = signal<TaskItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly openCount = signal(0);
  readonly blockedCount = signal(0);
  readonly overdueCount = signal(0);
  readonly doneCount = signal(0);
  readonly hasMore = signal(false);

  get displayName(): string {
    return this.authState.user()?.name ?? 'User';
  }

  get canCreate(): boolean {
    const user = this.authState.user();
    if (!user) return false;
    const activeOrgId = this.authState.activeOrgId();
    return user.memberships.some((m) => m.orgId === activeOrgId && m.role !== 'viewer');
  }

  ngOnInit(): void {
    const user = this.authState.user();
    const orgId = this.authState.activeOrgId();
    if (!user || !orgId) {
      this.loading.set(false);
      return;
    }

    this.sub = this.tasksApi.list({ orgId, limit: 10, sort: 'updatedAt', order: 'desc' }).subscribe({
      next: (result) => {
        this.tasks.set(result.items);
        this.hasMore.set(result.hasMore);
        this.openCount.set(result.items.filter((t) => t.status !== 'DONE' && t.status !== 'BLOCKED').length);
        this.blockedCount.set(result.items.filter((t) => t.status === 'BLOCKED').length);
        this.overdueCount.set(result.items.filter((t) => this.isOverdue(t)).length);
        this.doneCount.set(result.items.filter((t) => t.status === 'DONE').length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load tasks.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  isOverdue(task: TaskItem): boolean {
    if (!task.dueAt || task.status === 'DONE') return false;
    return new Date(task.dueAt) < new Date();
  }
}
