import { HttpInterceptorFn, HttpHandlerFn, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError, from } from 'rxjs';
import { AuthState } from './auth.state';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const isAuthEndpoint = req.url.includes('/auth/');
  const isLogin = req.url.includes('/auth/login');
  const isRefresh = req.url.includes('/auth/refresh');
  const isMutating = req.method !== 'GET' && req.method !== 'HEAD';

  let authReq = req;

  // Add CSRF token for mutating auth requests (except login)
  if (isMutating && isAuthEndpoint && !isLogin) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      authReq = authReq.clone({
        setHeaders: { 'X-CSRF-Token': csrfToken },
      });
    }
  }

  // Skip auth header for login/refresh endpoints
  if (isLogin || isRefresh) {
    return next(authReq);
  }

  const token = authState.getAccessToken();
  if (token && req.url.startsWith('/api/')) {
    authReq = authReq.clone({
      setHeaders: { ...authReq.headers, Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        return from(authState.refreshOnLoad()).pipe(
          switchMap(() => {
            const newToken = authState.getAccessToken();
            if (newToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retryReq);
            }
            authState.logout();
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
