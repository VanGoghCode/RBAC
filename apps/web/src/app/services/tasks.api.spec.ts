import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TasksApi } from './tasks.api';

describe('TasksApi', () => {
  let api: TasksApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(TasksApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists tasks', () => {
    const mockResponse = { items: [{ id: '1', title: 'Test' }], nextCursor: undefined, hasMore: false };
    api.list({ orgId: 'org-1' }).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === '/api/tasks');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('orgId')).toBe('org-1');
    req.flush(mockResponse);
  });

  it('gets task by id', () => {
    api.getById('task-1').subscribe();

    const req = httpMock.expectOne('/api/tasks/task-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates task', () => {
    const payload = { title: 'New Task', orgId: 'org-1' };
    api.create(payload).subscribe();

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('updates task', () => {
    api.update('task-1', { status: 'DONE' }).subscribe();

    const req = httpMock.expectOne('/api/tasks/task-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'DONE' });
    req.flush({});
  });

  it('deletes task', () => {
    api.delete('task-1').subscribe();

    const req = httpMock.expectOne('/api/tasks/task-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });

  it('gets activities', () => {
    api.getActivities('task-1', { limit: 10 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/tasks/task-1/activity');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], nextCursor: undefined, hasMore: false });
  });

  it('adds comment', () => {
    api.addComment('task-1', 'Hello').subscribe();

    const req = httpMock.expectOne('/api/tasks/task-1/comments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ comment: 'Hello' });
    req.flush({});
  });
});
