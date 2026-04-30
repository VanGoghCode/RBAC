import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TaskItem {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  tags: string[];
  visibility: string;
  createdById: string;
  assigneeId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  items: TaskItem[];
  nextCursor: string | undefined;
  hasMore: boolean;
}

export interface TaskListParams {
  status?: string;
  priority?: string;
  assigneeId?: string;
  orgId?: string;
  search?: string;
  category?: string;
  dueBefore?: string;
  dueAfter?: string;
  cursor?: string;
  limit?: number;
  sort?: 'updatedAt' | 'createdAt' | 'dueAt';
  order?: 'asc' | 'desc';
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  visibility?: string;
  assigneeId?: string;
  dueAt?: string;
  orgId: string;
  dedupDecision?: 'MERGE' | 'SKIP' | 'CREATE_ANYWAY' | 'DISMISSED';
  dedupRationale?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  category?: string | null;
  tags?: string[];
  visibility?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
}

export interface ActivityItem {
  id: string;
  taskId: string;
  actorId: string;
  actorName: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  comment: string | null;
  createdAt: string;
}

export interface PaginatedActivities {
  items: ActivityItem[];
  nextCursor: string | undefined;
  hasMore: boolean;
}

export interface DedupCandidate {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  updatedAt: string;
  similarity: number;
}

export interface DedupCheckResponse {
  candidates: DedupCandidate[];
  hasDuplicates: boolean;
}

export interface DedupConflictError {
  statusCode: number;
  message: string;
  candidates: DedupCandidate[];
}

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tasks';

  list(params?: TaskListParams): Observable<PaginatedTasks> {
    let httpParams = new HttpParams();
    if (params) {
      const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
      for (const [key, value] of entries) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<PaginatedTasks>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<TaskItem> {
    return this.http.get<TaskItem>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateTaskPayload): Observable<TaskItem> {
    return this.http.post<TaskItem>(this.baseUrl, payload);
  }

  checkDuplicates(payload: { title: string; description?: string; orgId: string }): Observable<DedupCheckResponse> {
    return this.http.post<DedupCheckResponse>(`${this.baseUrl}/deduplicate`, payload);
  }

  update(id: string, payload: UpdateTaskPayload): Observable<TaskItem> {
    return this.http.patch<TaskItem>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  getActivities(taskId: string, params?: { cursor?: string; limit?: number; order?: 'asc' | 'desc' }): Observable<PaginatedActivities> {
    let httpParams = new HttpParams();
    if (params) {
      const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
      for (const [key, value] of entries) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<PaginatedActivities>(`${this.baseUrl}/${taskId}/activity`, { params: httpParams });
  }

  addComment(taskId: string, comment: string): Observable<ActivityItem> {
    return this.http.post<ActivityItem>(`${this.baseUrl}/${taskId}/comments`, { comment });
  }
}
