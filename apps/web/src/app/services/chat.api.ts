import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthState } from '../auth/auth.state';

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

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

@Injectable({ providedIn: 'root' })
export class ChatApi {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly baseUrl = '/api/chat';

  ask(request: ChatAskRequest): Observable<ChatAskResponse> {
    return this.http.post<ChatAskResponse>(`${this.baseUrl}/ask`, request);
  }

  /**
   * Stream a chat response via SSE. Calls onToken for each incremental
   * chunk of text, then resolves with the final ChatAskResponse.
   */
  askStream(
    request: ChatAskRequest,
    onToken: (text: string) => void,
  ): Promise<ChatAskResponse> {
    return new Promise((resolve, reject) => {
      const token = this.authState.getAccessToken();
      if (!token) {
        reject(new Error('Not authenticated'));
        return;
      }

      const csrfToken = getCookie('csrf_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      let accumulated = '';

      fetch(`${this.baseUrl}/ask/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }).then(async (response) => {
        if (!response.ok) {
          reject(new Error(`HTTP ${response.status}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'token') {
                accumulated += event.text;
                onToken(accumulated);
              } else if (event.type === 'blocked') {
                accumulated = event.text;
                onToken(accumulated);
              } else if (event.type === 'error') {
                reject(new Error(event.text));
                return;
              } else if (event.type === 'complete') {
                resolve(event as ChatAskResponse);
                return;
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }

        // Stream ended without complete event
        if (accumulated) {
          resolve({
            answer: accumulated,
            sources: [],
            conversationId: request.conversationId ?? '',
            userMessageId: '',
            assistantMessageId: '',
            intent: 'query',
            guardrailSafe: true,
            latencyMs: 0,
          });
        } else {
          reject(new Error('Stream ended without response'));
        }
      }).catch(reject);
    });
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
