import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/timeline/timeline.component').then(
        (m) => m.TimelineComponent,
      ),
  },
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/messages/messages.component').then(
        (m) => m.MessagesComponent,
      ),
  },
  {
    path: 'events',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/events/events.component').then((m) => m.EventsComponent),
  },
  {
    path: 'members',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/members/members.component').then(
        (m) => m.MembersComponent,
      ),
  },
  {
    path: 'emergency',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/emergency/emergency.component').then(
        (m) => m.EmergencyComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent,
      ),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: 'yonetim',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
