export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
}
