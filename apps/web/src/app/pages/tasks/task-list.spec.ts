import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { TasksApi, TaskItem } from '../../services/tasks.api';
import { TaskListPage } from './task-list';

const mockProfile = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  disabledAt: null,
  memberships: [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme', role: 'admin' }],
};

const mockTasks: TaskItem[] = [
  {
    id: 't-1',
    title: 'Fix login bug',
    status: 'TODO',
    priority: 'HIGH',
    category: null,
    assigneeId: 'user-1',
    dueAt: null,
    updatedAt: '2026-04-28T00:00:00Z',
  },
  {
    id: 't-2',
    title: 'Write tests',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    category: null,
    assigneeId: null,
    dueAt: null,
    updatedAt: '2026-04-29T00:00:00Z',
  },
];

describe('TaskListPage', () => {
  let tasksApi: { list: jest.Mock };
  let authState: AuthState;

  beforeEach(async () => {
    tasksApi = {
      list: jest.fn().mockReturnValue(of({
        items: mockTasks,
        nextCursor: undefined,
        hasMore: false,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [TaskListPage],
      providers: [
        { provide: TasksApi, useValue: tasksApi },
        { provide: AuthState, useClass: AuthState },
        provideRouter([]),
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthState);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders task titles in table', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fix login bug');
    expect(el.textContent).toContain('Write tests');
  });

  it('shows status badges', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('To Do');
    expect(el.textContent).toContain('In Progress');
  });

  it('shows New Task link for admin', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('New Task');
  });

  it('shows search input', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[type="search"]')).toBeTruthy();
  });

  it('shows filter dropdowns', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no tasks', () => {
    tasksApi.list.mockReturnValue(of({
      items: [],
      nextCursor: undefined,
      hasMore: false,
    }));
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No tasks found');
  });

  it('calls API with orgId on init', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1' }),
    );
  });

  it('has search with debounce', () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();
    // Type in search — should not call API immediately
    fixture.componentInstance.onSearch('bug');
    expect(tasksApi.list).toHaveBeenCalledTimes(1); // only init call
  });
});
