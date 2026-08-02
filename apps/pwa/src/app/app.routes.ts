import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/timeline/timeline.component').then(
        (m) => m.TimelineComponent
      ),
  },
  {
    path: 'emergency',
    loadComponent: () =>
      import('./features/emergency/emergency.component').then(
        (m) => m.EmergencyComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
