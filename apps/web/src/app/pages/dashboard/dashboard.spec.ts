import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { TasksApi } from '../../services/tasks.api';
import { DashboardPage } from './dashboard';
import type { UserProfileResponse } from '@task-ai/shared/types';

const mockProfile: UserProfileResponse = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  disabledAt: null,
  memberships: [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme', role: 'admin' }],
};

describe('DashboardPage', () => {
  let authState: AuthState;
  let tasksApi: { list: jest.Mock };

  beforeEach(async () => {
    tasksApi = {
      list: jest.fn().mockReturnValue(of({
        items: [],
        nextCursor: undefined,
        hasMore: false,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: TasksApi, useValue: tasksApi },
        provideRouter([]),
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthState);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows welcome subtitle', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Welcome, Admin');
  });

  it('shows empty state when no tasks', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No tasks yet');
  });

  it('shows summary cards', () => {
    tasksApi.list.mockReturnValue(of({
      items: [
        { id: '1', status: 'TODO', priority: 'HIGH', dueAt: null },
        { id: '2', status: 'DONE', priority: 'LOW', dueAt: null },
      ],
      nextCursor: undefined,
      hasMore: false,
    }));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.summary-card').length).toBe(4);
  });

  it('calls tasks API with orgId', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1' }),
    );
  });
});
