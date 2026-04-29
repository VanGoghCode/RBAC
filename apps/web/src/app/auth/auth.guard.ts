import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthState } from './auth.state';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
