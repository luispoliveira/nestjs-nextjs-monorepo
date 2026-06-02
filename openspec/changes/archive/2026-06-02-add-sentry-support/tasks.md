## 1. Dependency

- [x] 1.1 Add `@sentry/nestjs` to `packages/shared/package.json` dependencies and run `pnpm install`

## 2. Shared — SentryUtil

- [x] 2.1 Create `packages/shared/src/utils/sentry.util.ts` with `SentryUtil.init(appName: string)` — reads `process.env.SENTRY_DSN`, returns early if absent, calls `Sentry.init()` with `tracesSampleRate: 0` and `initialScope.tags.app = appName`
- [x] 2.2 Export `SentryUtil` from `packages/shared/src/utils/index.ts`
- [x] 2.3 Verify `SentryUtil` is re-exported from `packages/shared/src/index.ts`

## 3. Shared — AllExceptionFilter fix + Sentry capture

- [x] 3.1 Read `packages/shared/src/filters/http-exception.filter.ts` before editing
- [x] 3.2 Add RPC context branch: check `host.getType() === 'rpc'`, log the error, call `Sentry.captureException()`, and rethrow the exception
- [x] 3.3 In the HTTP branch, call `Sentry.captureException(exception)` only when resolved status is >= 500 (skip `ZodValidationException` path — no change there)

## 4. Backend apps — SentryUtil.init call

- [x] 4.1 Edit `apps/api/src/main.ts`: add `SentryUtil.init('api')` as the first statement inside `bootstrap()`, before `NestFactory.create()`
- [x] 4.2 Edit `apps/auth/src/main.ts`: add `SentryUtil.init('auth')` before `NestFactory.create()`
- [x] 4.3 Edit `apps/notifications/src/main.ts`: add `SentryUtil.init('notifications')` before `NestFactory.create()`
- [x] 4.4 Edit `apps/worker/src/main.ts`: add `SentryUtil.init('worker')` before `NestFactory.create()`

## 5. Worker — Bull job failure capture

- [x] 5.1 Read `apps/worker/src/consumer/email.consumer.ts` before editing
- [x] 5.2 Add `@OnQueueFailed()` handler method to `EmailConsumer` that calls `Sentry.captureException(error)` with `extra: { jobId, jobName: job.name, data: job.data }` and `tags: { queue: QUEUES.EMAIL, app: 'worker' }`
- [x] 5.3 Import `OnQueueFailed` from `@nestjs/bull` and `* as Sentry from '@sentry/nestjs'` in `email.consumer.ts`

## 6. Build and verify

- [x] 6.1 Run `pnpm build` from the monorepo root and confirm zero TypeScript errors
- [x] 6.2 Run `pnpm lint` and fix any lint issues introduced
