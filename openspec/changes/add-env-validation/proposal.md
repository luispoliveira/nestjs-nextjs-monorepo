## Why

Environment variables are loaded via `ConfigModule.forRoot()` without a `validate` option — missing or malformed vars (e.g. `BETTER_AUTH_SECRET`, `DATABASE_URL`) cause silent failures at runtime rather than a hard crash at boot. Two additional `process.env` accesses bypass `ConfigService` entirely in the auth app.

## What Changes

- Add a `baseEnvSchema` (Zod) to `@repo/shared` covering vars common to all NestJS apps.
- Extend `SharedModule.register()` to accept a `validate` callback, threaded into `ConfigModule.forRoot()`.
- Add per-app env schemas (`env.ts`) for `auth`, `api`, `notifications`, and `worker` — each extending the base schema.
- Replace `process.env.GOOGLE_CLIENT_ID` / `process.env.GOOGLE_CLIENT_SECRET` direct accesses in `apps/auth` with `ConfigService.get()`.
- Add `apps/web/env.ts` with a Zod parse at module load time (Next.js cannot use NestJS ConfigModule).

## Capabilities

### New Capabilities

- `env-validation`: Runtime schema validation of environment variables at application boot — fails fast with a clear error listing every missing or malformed variable before any request is served.

### Modified Capabilities

*(none — no existing spec-level behaviour changes)*

## Impact

- **`packages/shared`**: new file `src/config/base-env.schema.ts`; `SharedModule.register()` params extended with optional `validate` field.
- **`apps/auth`**: new `src/env.ts`; `app.module.ts` updated to pass `validate` and replace direct `process.env` accesses.
- **`apps/api`**: new `src/env.ts`; `app.module.ts` updated to pass `validate`.
- **`apps/notifications`**: new `src/env.ts`; `app.module.ts` updated to pass `validate`.
- **`apps/worker`**: new `src/env.ts`; `app.module.ts` updated to pass `validate`.
- **`apps/web`**: new `env.ts` at app root; consumed by server utilities that currently read `process.env` directly.
- **No new dependencies** — Zod is already installed across all packages.
- **No breaking changes** — existing `.env` files that are valid continue to work unchanged.
