## Why

The four backend apps (`api`, `auth`, `notifications`, `worker`) have no runtime error visibility — exceptions are logged to stdout and MongoDB but never surfaced in an alerting system. Sentry provides structured error aggregation, deduplication, and alerting with zero-friction integration into the existing `AllExceptionFilter` and Bull queue infrastructure.

## What Changes

- Add `@sentry/nestjs` as a dependency of `@repo/shared`
- Introduce `SentryUtil.init(appName)` in `@repo/shared` — called at the top of each app's `bootstrap()` before `NestFactory.create()`
- Extend `AllExceptionFilter` to capture unhandled exceptions (HTTP 5xx) and all microservice RPC exceptions to Sentry; fix the existing bug where RPC context causes a runtime crash
- Add `@OnQueueFailed` handler to `EmailConsumer` (worker) to capture Bull v4 job failures
- All apps share a single Sentry DSN; each app sets an `app` tag so errors are filterable by service
- `SENTRY_DSN` is optional — omitting it disables Sentry silently (dev-friendly)

## Capabilities

### New Capabilities

- `sentry-error-tracking`: Centralised error capture for HTTP, RPC microservice, and Bull queue contexts across all backend apps, with per-app tagging and graceful opt-out when DSN is absent

### Modified Capabilities

*(none — no existing spec-level behaviour changes)*

## Impact

- **`packages/shared`**: new `SentryUtil`, modified `AllExceptionFilter` (RPC fix + Sentry capture), new peer dependency `@sentry/nestjs`
- **`apps/api`, `apps/auth`, `apps/notifications`, `apps/worker`**: each `main.ts` gains one `SentryUtil.init()` call
- **`apps/worker/src/consumer/email.consumer.ts`**: new `@OnQueueFailed` handler
- **Environment**: new optional `SENTRY_DSN` variable across all backend `.env` files
- **No breaking changes**, no API surface changes, no database migrations
