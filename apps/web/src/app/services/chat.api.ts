import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatSource {
  taskId: string;
  title: string;
  similarity: number;
  status?: string;
  priority?: string;
  assigneeName?: string;
  dueAt?: string | null;
}

export interface ChatAskResponse {
  answer: string;
  sources: ChatSource[];
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  intent: 'query' | 'create_task' | 'unknown';
  guardrailSafe: boolean;
  latencyMs: number;
}

export interface ChatAskRequest {
  message: string;
  conversationId?: string;
  orgId: string;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatHistoryResponse {
  items: ChatConversation[];
  hasMore: boolean;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sourcesJson: unknown | null;
  guardrailResultJson: unknown | null;
  createdAt: string;
}

export interface ConversationMessagesResponse {
  items: ChatMessage[];
  hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/chat';

  ask(request: ChatAskRequest): Observable<ChatAskResponse> {
    return this.http.post<ChatAskResponse>(`${this.baseUrl}/ask`, request);
  }

  getHistory(params?: { limit?: number; before?: string }): Observable<ChatHistoryResponse> {
    let httpParams = new HttpParams();
    if (params) {
      const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
      for (const [key, value] of entries) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<ChatHistoryResponse>(`${this.baseUrl}/history`, { params: httpParams });
  }

  getConversation(conversationId: string, params?: { limit?: number; cursor?: string }): Observable<ConversationMessagesResponse> {
    let httpParams = new HttpParams();
    if (params) {
      const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
      for (const [key, value] of entries) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<ConversationMessagesResponse>(`${this.baseUrl}/conversations/${conversationId}`, { params: httpParams });
  }
}
