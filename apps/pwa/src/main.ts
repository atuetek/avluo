import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { applyRuntimeConfig } from './app/core/environment';

async function loadRuntimeConfig() {
  try {
    const res = await fetch('/assets/config.json', { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      applyRuntimeConfig(cfg);
    }
  } catch {
    /* optional — use compile-time env */
  }
}

loadRuntimeConfig().then(() =>
  bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideServiceWorker('ngsw-worker.js', {
        enabled: false,
        registrationStrategy: 'registerWhenStable:30000',
      }),
    ],
  }),
).catch((err) => console.error(err));
