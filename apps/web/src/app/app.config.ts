import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { routes } from './app.routes';
import { createQueryClient } from './query-client';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // apps/api (same-origin /api) — see features/customers/customers.api.ts
    provideHttpClient(withFetch()),
    provideTanStackQuery(createQueryClient()),
  ],
};
