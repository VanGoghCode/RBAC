import { DatePipe } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-task-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PageHeader, StatusBadge, PriorityBadge, EmptyState, LoadingComponent, ErrorAlert],
  template: `
    <app-page-header heading="Tasks">
      @if (canCreate) {
        <a routerLink="/tasks/new" class="btn btn-primary">New Task</a>
      }
    </app-page-header>

    <!-- Filters -->
    <div class="filters" role="search" aria-label="Filter tasks">
      <input
        type="search"
        placeholder="Search tasks..."
        [ngModel]="search()"
        (ngModelChange)="onSearch($event)"
        class="input search-input"
        aria-label="Search tasks"
      />
      <select [ngModel]="statusFilter()" (ngModelChange)="onFilter('status', $event)" class="input" aria-label="Filter by status">
        <option value="">All Statuses</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="BLOCKED">Blocked</option>
        <option value="DONE">Done</option>
      </select>
      <select [ngModel]="priorityFilter()" (ngModelChange)="onFilter('priority', $event)" class="input" aria-label="Filter by priority">
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>
      <select [ngModel]="sortField()" (ngModelChange)="onSort($event)" class="input" aria-label="Sort by">
        <option value="updatedAt">Last Updated</option>
        <option value="createdAt">Created</option>
        <option value="dueAt">Due Date</option>
      </select>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-alert [message]="error()!" />
    } @else if (tasks().length === 0) {
      <app-empty-state title="No tasks found" icon="\uD83D\uDD0D" description="Try adjusting your filters or create a new task.">
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
              <th scope="col">Assignee</th>
              <th scope="col">Due</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            @for (task of tasks(); track task.id) {
              <tr>
                <td><a [routerLink]="['/tasks', task.id]">{{ task.title }}</a></td>
                <td><app-status-badge [status]="task.status" /></td>
                <td><app-priority-badge [priority]="task.priority" /></td>
                <td class="text-muted">{{ task.assigneeId ? 'Assigned' : 'Unassigned' }}</td>
                <td>
                  @if (task.dueAt) {
                    <span [class.overdue]="isOverdue(task)">{{ task.dueAt | date:'shortDate' }}</span>
                  } @else {
                    <span class="text-muted">&mdash;</span>
                  }
                </td>
                <td class="text-muted">{{ task.updatedAt | date:'shortDate' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (hasMore()) {
        <div class="load-more">
          <button class="btn btn-secondary" (click)="loadMore()">Load More</button>
        </div>
      }
    }
  `,
  styles: [`
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }
    .search-input { flex: 1; min-width: 200px; }
    .task-table-wrap { overflow-x: auto; }
    .task-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .task-table th { text-align: left; padding: var(--space-sm) var(--space-md); border-bottom: 2px solid var(--color-border); color: var(--color-text-muted); font-weight: 600; }
    .task-table td { padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--color-border); }
    .task-table a { color: var(--color-primary); }
    .task-table a:hover { text-decoration: underline; }
    .overdue { color: var(--color-error); font-weight: 600; }
    .text-muted { color: var(--color-text-muted); }
    .load-more { text-align: center; margin-top: var(--space-md); }
  `],
})
export class TaskListPage implements OnInit, OnDestroy {
  private readonly tasksApi = inject(TasksApi);
  private readonly authState = inject(AuthState);
  private sub?: Subscription;
  private searchTimeout?: ReturnType<typeof setTimeout>;

  readonly tasks = signal<TaskItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly priorityFilter = signal('');
  readonly sortField = signal<'updatedAt' | 'createdAt' | 'dueAt'>('updatedAt');

  private orgId = '';
  private cursor?: string;

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
    this.orgId = orgId;
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadTasks(), 300);
  }

  onFilter(field: 'status' | 'priority', value: string): void {
    if (field === 'status') this.statusFilter.set(value);
    else this.priorityFilter.set(value);
    this.loadTasks();
  }

  onSort(value: 'updatedAt' | 'createdAt' | 'dueAt'): void {
    this.sortField.set(value);
    this.loadTasks();
  }

  loadMore(): void {
    this.loadTasks(true);
  }

  isOverdue(task: TaskItem): boolean {
    if (!task.dueAt || task.status === 'DONE') return false;
    return new Date(task.dueAt) < new Date();
  }

  private loadTasks(append = false): void {
    this.sub?.unsubscribe();
    if (!append) this.loading.set(true);
    this.error.set(null);

    this.sub = this.tasksApi.list({
      orgId: this.orgId,
      search: this.search() || undefined,
      status: this.statusFilter() || undefined,
      priority: this.priorityFilter() || undefined,
      sort: this.sortField(),
      order: 'desc',
      limit: 20,
      cursor: append ? this.cursor : undefined,
    }).subscribe({
      next: (result) => {
        if (append) {
          this.tasks.update((prev) => [...prev, ...result.items]);
        } else {
          this.tasks.set(result.items);
        }
        this.cursor = result.nextCursor;
        this.hasMore.set(result.hasMore);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load tasks.');
        this.loading.set(false);
      },
    });
  }
}
