## Context

`ConfigModule.forRoot()` is registered once inside `SharedModule.register()` (global, `isGlobal: true`). All four NestJS apps boot through `SharedModule`, making it the single insertion point for a `validate` callback. Currently the `validate` option is absent — env vars are consumed with `configService.getOrThrow()` at call time, meaning failures surface during request handling, not at boot.

Two additional leaks exist: `apps/auth/src/app.module.ts` reads `process.env.GOOGLE_CLIENT_ID` and `process.env.GOOGLE_CLIENT_SECRET` directly, bypassing `ConfigService` entirely.

`apps/web` is a Next.js app and cannot use NestJS `ConfigModule`; env validation there must happen at module-load time via a top-level Zod parse.

## Goals / Non-Goals

**Goals:**
- Crash at boot with a clear, structured error message if required vars are missing or malformed.
- One shared base schema for vars common to all NestJS apps (`DATABASE_URL`, `REDIS_*`, `MONGO_URI`, `PORT`, `NODE_ENV`).
- Each NestJS app owns its own schema extending the base — validates only what it needs.
- `apps/web` validated independently via a top-level `env.ts` module.
- Eliminate all `process.env` direct reads inside app code (except `main.ts`).

**Non-Goals:**
- Secret management / Vault integration.
- Runtime hot-reload of env vars.
- Validating Docker-level infra vars (postgres.env, mongo.env).

## Decisions

### 1. `validate` threaded through `SharedModule.register()` params

**Decision:** Add an optional `validate?: (config: Record<string, unknown>) => Record<string, unknown>` to `SharedModuleRegisterParams`. Thread it directly into `ConfigModule.forRoot({ validate })`.

**Alternatives considered:**
- *Each app registers its own `ConfigModule`*: Would break the `isGlobal: true` single-registration guarantee; two `ConfigModule.forRoot()` calls in the same process conflict.
- *One superset schema in SharedModule*: Forces the worker to declare `BETTER_AUTH_SECRET`; forces auth to declare `BREVO_API_KEY`. Tight coupling with no benefit.

**Rationale:** The shared module owns the ConfigModule registration; extending its params is the minimal, non-breaking addition.

---

### 2. `baseEnvSchema` in `@repo/shared`, per-app schemas extend it

**Decision:** `packages/shared/src/config/base-env.schema.ts` exports `baseEnvSchema`. Each app's `src/env.ts` does `baseEnvSchema.extend({...})` and exports the typed result.

```
baseEnvSchema (DATABASE_URL, REDIS_HOST, REDIS_PORT, MONGO_URI, PORT, NODE_ENV)
    └── authEnvSchema      (+ BETTER_AUTH_SECRET, ADMIN_EMAIL, UI_URL, GOOGLE_*)
    └── apiEnvSchema       (+ BETTER_AUTH_SECRET, BETTER_AUTH_URL, ADMIN_EMAIL)
    └── notificationsEnvSchema  (+ CORS_ORIGIN)
    └── workerEnvSchema    (+ BREVO_API_KEY, FROM_EMAIL, FROM_NAME, DEV_EMAIL)
```

**Rationale:** DRY for the common vars; each app independently validates its own surface.

---

### 3. Zod `z.coerce.number()` for PORT and REDIS_PORT

**Decision:** All numeric env vars use `z.coerce.number()` to convert the string from `process.env` to a number before validation.

**Rationale:** `process.env` values are always strings. `z.number()` would reject `"6379"` with a type error; `z.coerce.number()` handles the conversion transparently.

---

### 4. `apps/web/env.ts` — top-level Zod parse

**Decision:** A module-level `export const env = webEnvSchema.parse(process.env)` that throws on first import if vars are invalid. Import this module in `apps/web/lib/auth/server.ts` and any other server utility that reads env vars.

**Alternatives considered:**
- *`@t3-oss/env-nextjs`*: Adds a dependency for what four lines of Zod accomplish.

**Rationale:** No new dependency; same fail-fast guarantee.

---

### 5. GOOGLE_CLIENT_* are optional at schema level

**Decision:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are `z.string().optional()` in `authEnvSchema`. A separate runtime guard inside the factory (`if (clientId) { socialProviders: { google: {...} } }`) handles conditional activation.

**Rationale:** Social providers are opt-in in this template. Requiring them at boot would break deployments that don't use Google OAuth.

## Risks / Trade-offs

- **Zod parse error messages on boot** — ZodError output is verbose by default. If `ZodValidationException` is not formatted nicely by the bootstrap logger, the error may be hard to read. Mitigation: wrap the `validate` call in a try/catch and `console.error(zodError.flatten())` before re-throwing, or rely on NestJS's default startup error output.
- **`REDIS_PORT` coercion** — `z.coerce.number()` silently accepts `"abc"` as `NaN`. Add `.int().positive()` to catch this. Already included in the schema design.
- **apps/web env.ts throws at build time** — Next.js imports `env.ts` during `next build`; if the build environment lacks the vars, the build fails. This is intentional for CI but needs `.env.local` or `dotenv` injection in the build pipeline.

## Migration Plan

1. Add `base-env.schema.ts` to `@repo/shared` and export from its barrel.
2. Update `SharedModule.register()` params type and ConfigModule call (non-breaking — `validate` is optional, default `undefined`).
3. Add `env.ts` to each NestJS app. Wire `validate` in each app's `AppModule`.
4. Add `apps/web/env.ts`. Update server utilities to import from it.
5. Replace `process.env.GOOGLE_CLIENT_ID/SECRET` in `apps/auth/src/app.module.ts` with `configService.get()`.
6. Run `pnpm build && pnpm check-types` — no runtime change, only type surface additions.

**Rollback:** Remove the `validate` option from `SharedModule.register()` params and delete the `env.ts` files. Zero impact on existing behaviour.
