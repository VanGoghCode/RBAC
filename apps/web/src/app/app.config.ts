import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthState } from './auth/auth.state';

export function initAuth(authState: AuthState): () => Promise<void> {
  return () => authState.refreshOnLoad();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: 'APP_INITIALIZER',
      useFactory: initAuth,
      deps: [AuthState],
      multi: true,
    },
  ],
};
