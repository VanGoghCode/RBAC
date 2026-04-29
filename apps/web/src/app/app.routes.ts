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
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/tasks/task-list').then((m) => m.TaskListPage),
      },
      {
        path: 'tasks/new',
        loadComponent: () => import('./pages/tasks/task-create').then((m) => m.TaskCreatePage),
      },
      {
        path: 'tasks/:id',
        loadComponent: () => import('./pages/tasks/task-detail').then((m) => m.TaskDetailPage),
      },
      {
        path: 'tasks/:id/edit',
        loadComponent: () => import('./pages/tasks/task-edit').then((m) => m.TaskEditPage),
      },
    ],
  },
];
