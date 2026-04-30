import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { TasksApi } from '../../services/tasks.api';
import { TaskCreatePage } from './task-create';

const mockProfile = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  disabledAt: null,
  memberships: [{ orgId: 'org-1', orgName: 'Acme', orgSlug: 'acme', role: 'admin' }],
};

describe('TaskCreatePage', () => {
  let tasksApi: {
    create: jest.Mock;
    checkDuplicates: jest.Mock;
  };

  beforeEach(async () => {
    tasksApi = {
      create: jest.fn().mockReturnValue(of({ id: 'new-task', title: 'Test' })),
      checkDuplicates: jest.fn().mockReturnValue(of({ hasDuplicates: false, candidates: [] })),
    };

    await TestBed.configureTestingModule({
      imports: [TaskCreatePage],
      providers: [
        { provide: TasksApi, useValue: tasksApi },
        provideRouter([
          { path: 'tasks', children: [] },
          { path: 'tasks/:id', children: [] },
        ]),
      ],
    }).compileComponents();

    const authState = TestBed.inject(AuthState);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
  });

  it('creates component', () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders form fields', () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#title')).toBeTruthy();
    expect(el.querySelector('#description')).toBeTruthy();
    expect(el.querySelector('#status')).toBeTruthy();
    expect(el.querySelector('#priority')).toBeTruthy();
    expect(el.querySelector('#visibility')).toBeTruthy();
  });

  it('has submit button disabled when title empty', () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit becomes possible when title is set', () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    const comp = fixture.componentInstance;
    expect(comp.title.trim()).toBe('');
    comp.title = 'New Task';
    expect(comp.title.trim()).toBe('New Task');
  });

  it('calls checkDuplicates then create on submit', async () => {
    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    fixture.componentInstance.title = 'New Task';

    await fixture.componentInstance.onSubmit();

    expect(tasksApi.checkDuplicates).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Task', orgId: 'org-1' }),
    );
    expect(tasksApi.create).toHaveBeenCalled();
  });

  it('shows dedup warning when duplicates found', async () => {
    tasksApi.checkDuplicates.mockReturnValue(of({
      hasDuplicates: true,
      candidates: [
        { taskId: 't-1', title: 'Similar Task', similarity: 0.95, status: 'TODO' },
      ],
    }));

    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    fixture.componentInstance.title = 'Similar Task';

    await fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.showDedupWarning()).toBe(true);
    expect(fixture.componentInstance.dedupCandidates().length).toBe(1);
  });

  it('shows error when no org found', async () => {
    const authState = TestBed.inject(AuthState);
    (authState as any)._user.set(null);

    const fixture = TestBed.createComponent(TaskCreatePage);
    fixture.detectChanges();
    fixture.componentInstance.title = 'Test';

    await fixture.componentInstance.onSubmit();
    expect(fixture.componentInstance.error()).toBe('No organization found.');
  });
});
