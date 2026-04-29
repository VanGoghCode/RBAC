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
    <app-page-header heading="Dashboard" [subtitle]="'Welcome, ' + displayName">
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
        <div class="summary-card">
          <span class="summary-value">{{ openCount() }}</span>
          <span class="summary-label">Open</span>
        </div>
        <div class="summary-card card-blocked">
          <span class="summary-value">{{ blockedCount() }}</span>
          <span class="summary-label">Blocked</span>
        </div>
        <div class="summary-card card-overdue">
          <span class="summary-value">{{ overdueCount() }}</span>
          <span class="summary-label">Overdue</span>
        </div>
        <div class="summary-card card-done">
          <span class="summary-value">{{ doneCount() }}</span>
          <span class="summary-label">Completed</span>
        </div>
      </div>

      <h2 class="section-title">Recent Tasks</h2>
      @if (tasks().length === 0) {
        <app-empty-state title="No tasks yet" icon="\uD83D\uDCCB" description="Create your first task to get started.">
          <a routerLink="/tasks/new" class="btn btn-primary">Create Task</a>
        </app-empty-state>
      } @else {
        <div class="task-table-wrap">
          <table class="task-table">
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
        @if (hasMore()) {
          <div class="more-link">
            <a routerLink="/tasks">View all tasks</a>
          </div>
        }
      }
    }
  `,
  styles: [`
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }
    .summary-card {
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      text-align: center;
      border-top: 3px solid var(--color-primary);
    }
    .card-blocked { border-top-color: var(--color-status-blocked); }
    .card-overdue { border-top-color: var(--color-warning); }
    .card-done { border-top-color: var(--color-status-done); }
    .summary-value { display: block; font-size: var(--text-2xl); font-weight: 700; }
    .summary-label { font-size: var(--text-sm); color: var(--color-text-muted); }
    .section-title { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-md); }
    .task-table-wrap { overflow-x: auto; }
    .task-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .task-table th { text-align: left; padding: var(--space-sm) var(--space-md); border-bottom: 2px solid var(--color-border); color: var(--color-text-muted); font-weight: 600; }
    .task-table td { padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--color-border); }
    .task-table a { color: var(--color-primary); }
    .task-table a:hover { text-decoration: underline; }
    .overdue { color: var(--color-error); font-weight: 600; }
    .text-muted { color: var(--color-text-muted); }
    .more-link { text-align: center; margin-top: var(--space-md); }
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
