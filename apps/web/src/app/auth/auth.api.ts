import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { LoginResponse, UserProfileResponse } from '@task-ai/shared/types';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/login`,
      { email, password },
      { withCredentials: true },
    );
  }

  refresh(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(
      `${this.baseUrl}/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logout(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/logout`,
      {},
      { withCredentials: true },
    );
  }

  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/me`, {
      withCredentials: true,
    });
  }
}
