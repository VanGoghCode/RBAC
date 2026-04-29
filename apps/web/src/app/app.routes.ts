import { Route } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';
import { LoginPage } from './pages/login/login';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
    ],
  },
];
