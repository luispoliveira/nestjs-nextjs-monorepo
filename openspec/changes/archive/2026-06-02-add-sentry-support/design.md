## Context

The monorepo has four backend apps (`api`, `auth`, `notifications`, `worker`). All share infrastructure through `@repo/shared`: `SharedModule` (global), `AllExceptionFilter` (HTTP only), `BootstrapUtil`, and pino logging. Errors today are logged to stdout and persisted to MongoDB via `LoggingInterceptor`, but no alerting layer exists.

Current gaps:
- `AllExceptionFilter` calls `host.switchToHttp()` unconditionally — this throws at runtime when a `@MessagePattern`/`@EventPattern` handler raises an exception in `auth` and `notifications` (RPC context)
- Bull job failures in `worker` are logged by Bull internally but never captured
- No structured error aggregation across services

## Goals / Non-Goals

**Goals:**
- Capture unhandled HTTP 5xx exceptions in all apps
- Fix the latent RPC-context crash in `AllExceptionFilter` and capture those errors
- Capture Bull v4 job failures in `worker`
- Single Sentry project; per-app `app` tag for filtering
- Graceful no-op when `SENTRY_DSN` is absent (local dev ergonomics)

**Non-Goals:**
- Performance/tracing (`tracesSampleRate: 0`)
- Separate Sentry projects per app
- Sentry integration in `apps/web` (Next.js)
- Sourcemap upload (can be added later)

## Decisions

### D1 — Initialisation in `main.ts`, not in `SharedModule`

`Sentry.init()` must execute before `NestFactory.create()` to patch Node.js internals. `SharedModule` is wired after the factory, so init cannot live there. Instead, `SentryUtil.init(appName)` is called as the first statement inside each app's `bootstrap()` function, before the `NestFactory.create()` call.

*Alternative considered*: a shared `instrument.ts` imported as a side-effect (`import './instrument'`). Rejected because it requires a static DSN at import time and cannot receive the per-app `appName` tag cleanly.

### D2 — `SentryUtil` in `@repo/shared`, not duplicated per app

The init logic (DSN read, environment, tracesSampleRate) is identical across apps. Centralising avoids drift. The only per-call argument is `appName` (string), used to set the `app` Sentry tag.

### D3 — Extend `AllExceptionFilter` rather than add a new filter

`AllExceptionFilter` is already registered globally via `SharedModule`. Adding Sentry capture here means zero per-app configuration. The fix for RPC context is a prerequisite and will be done in the same edit:

```
host.getType() === 'rpc'  →  log + Sentry.captureException() + rethrow
host.getType() === 'http' →  existing flow, Sentry.captureException() only for status >= 500
ZodValidationException    →  unchanged (no Sentry, client error)
```

*Alternative considered*: a separate `SentryInterceptor`. Rejected because interceptors do not catch exceptions — that is the filter's responsibility.

### D4 — `@OnQueueFailed` decorator for Bull v4 worker errors

`@sentry/nestjs` has no built-in Bull v4 integration (the Sentry Bull integration targets BullMQ). The `@nestjs/bull` package provides `@OnQueueFailed()`, which fires after any job in the processor's queue fails (including between retries). One handler in `EmailConsumer` covers all job types without touching individual `@Process()` methods.

### D5 — `@sentry/nestjs` as direct dependency of `@repo/shared`

`@sentry/nestjs` wraps `@sentry/node` and is the canonical NestJS package. It lives in `@repo/shared` dependencies (not peerDependencies) because the version must be pinned centrally. Apps do not need to install it separately.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Sentry SDK adds ~200 KB to each app's bundle | Acceptable for Node.js server processes; no bundle size budget |
| `@OnQueueFailed` fires on each retry attempt, not only on final failure | Sentry deduplicates by stack trace; minor noise on retried jobs is acceptable |
| RPC rethrow behaviour: after the filter catches and rethrows, NestJS serialises the error back to the caller | This matches what NestJS does natively without a filter; no regression |
| `SENTRY_DSN` missing in prod by mistake silences all error capture | CI or deployment checklist should assert `SENTRY_DSN` is set in production environments |

## Migration Plan

1. Merge the change — all Sentry calls are no-ops if `SENTRY_DSN` is absent
2. Set `SENTRY_DSN` in each backend app's production environment variables
3. Deploy apps one by one; verify errors appear in Sentry under the correct `app` tag
4. Rollback: remove `SENTRY_DSN` from env — Sentry goes silent, no code change needed
