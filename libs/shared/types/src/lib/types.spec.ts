import type { ApiResponse, TaskDto, UserDto, OrganizationDto, PaginationQuery } from './types';

describe('shared types', () => {
  it('should export ApiResponse', () => {
    const response: ApiResponse<string> = { success: true, data: 'test' };
    expect(response.success).toBe(true);
    expect(response.data).toBe('test');
  });

  it('should export TaskDto', () => {
    const task: TaskDto = {
      id: '1',
      title: 'Test task',
      status: 'todo',
      priority: 'medium',
      organizationId: 'org-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    expect(task.id).toBe('1');
  });

  it('should export UserDto', () => {
    const user: UserDto = {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      role: 'member',
      organizationId: 'org-1',
    };
    expect(user.email).toBe('test@example.com');
  });

  it('should export OrganizationDto', () => {
    const org: OrganizationDto = {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
    };
    expect(org.slug).toBe('test-org');
  });

  it('should export PaginationQuery', () => {
    const query: PaginationQuery = { page: 1, limit: 10 };
    expect(query.page).toBe(1);
  });
});
