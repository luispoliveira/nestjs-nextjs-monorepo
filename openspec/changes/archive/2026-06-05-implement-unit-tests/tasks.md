## 1. Fix apps/notifications coverage

- [x] 1.1 Add missing `AppService` tests: `sendPasswordChangeConfirmation`, `sendTwoFactorEnabledNotification`, `sendTwoFactorDisabledNotification`
- [x] 1.2 Create `apps/notifications/src/app.controller.spec.ts` with tests for all 6 `@EventPattern` handlers (validation + delegation per handler)
- [x] 1.3 Run `pnpm test:cov` in `apps/notifications` and confirm ≥80% on all metrics

## 2. Fix apps/auth coverage

- [x] 2.1 Create `apps/auth/src/local-auth.service.spec.ts` — mock `@thallesp/nestjs-better-auth` with `jest.mock()` factory
- [x] 2.2 Add test: `ensureAdminUser` skips creation when admin exists
- [x] 2.3 Add test: `ensureAdminUser` creates admin (signUpEmail + user.update) when user not found
- [x] 2.4 Add test: `handlePasswordChanged` emits `emitUserPasswordChanged` for valid session
- [x] 2.5 Add test: `handlePasswordChanged` throws when session is null
- [x] 2.6 Add test: `handleTwoFactorEnabled` emits `emitUserTwoFactorEnabled`
- [x] 2.7 Add test: `handleTwoFactorDisabled` emits `emitUserTwoFactorDisabled`
- [x] 2.8 Create `apps/auth/src/auth-trpc.middleware.spec.ts` — mock `@thallesp/nestjs-better-auth`
- [x] 2.9 Add test: `AuthTrpcMiddleware.use` passes user to context on valid session
- [x] 2.10 Add test: `AuthTrpcMiddleware.use` throws Unauthorized when session is null
- [x] 2.11 Add test: `AuthTrpcMiddleware.use` throws Unauthorized when `getSession` throws
- [x] 2.12 Run `pnpm test:cov` in `apps/auth` and confirm ≥80% on all metrics

## 3. Fix apps/worker coverage

- [x] 3.1 Create `apps/worker/src/dlq/dlq.controller.spec.ts` — test `list`, `replay`, `purge` message patterns
- [x] 3.2 Create `apps/worker/src/dlq/email.dlq.service.spec.ts` — verify instantiation as `BaseDlqService`
- [x] 3.3 Create `apps/worker/src/metrics/queue-metrics.service.spec.ts` — mock `prom-client` entirely; test `recordDuration` and `recordFailure`
- [x] 3.4 Expand `apps/worker/src/consumer/email.consumer.spec.ts` — add tests for uncovered job types: `sendPasswordResetEmail`, `sendEmailVerificationEmail`, `sendPasswordChangedEmail`, `sendTwoFactorEnabledEmail`, `sendTwoFactorDisabledEmail`
- [x] 3.5 Run `pnpm test:cov` in `apps/worker` and confirm ≥80% on all metrics

## 4. Add Jest config to packages/shared

- [x] 4.1 Add `devDependencies` to `packages/shared/package.json`: `@nestjs/testing`, `jest`, `ts-jest`, `@types/jest`
- [x] 4.2 Add `jest` config block in `packages/shared/package.json`: `rootDir: "src"`, `ts-jest` transform, 80% coverage thresholds
- [x] 4.3 Add `"test"` and `"test:cov"` scripts to `packages/shared/package.json`
- [x] 4.4 Verify `pnpm test` runs (zero specs is OK at this point)

## 5. Write packages/shared unit tests

- [x] 5.1 Create `packages/shared/src/filters/http-exception.filter.spec.ts` — test HTTP, ZodValidation, RPC, and 5xx Sentry paths
- [x] 5.2 Create `packages/shared/src/guards/microservice-auth.guard.spec.ts` — test public route bypass, missing token, valid auth (Observable), and auth failure
- [x] 5.3 Create `packages/shared/src/interceptors/correlation.interceptor.spec.ts` — test RPC sets correlationId, HTTP does not
- [x] 5.4 Create `packages/shared/src/abstracts/base.producer.spec.ts` — test `addJob` merges correlationId from CLS into job data
- [x] 5.5 Create `packages/shared/src/interceptors/logging.interceptor.spec.ts` — test createLog on request, updateLog on success, updateLog on error
- [x] 5.6 Create `packages/shared/src/metrics/http-metrics.interceptor.spec.ts` — mock prom-client; test metric recording on success and error, passthrough on non-HTTP
- [x] 5.7 Run `pnpm test:cov` in `packages/shared` and confirm ≥80% on all metrics

## 6. Add Jest config to packages/mail

- [x] 6.1 Add `devDependencies` to `packages/mail/package.json`: `jest`, `ts-jest`, `@types/jest`
- [x] 6.2 Add `jest` config block in `packages/mail/package.json` with 80% coverage thresholds
- [x] 6.3 Add `"test"` and `"test:cov"` scripts to `packages/mail/package.json`
- [x] 6.4 Create `packages/mail/src/mail.service.spec.ts` — mock HTTP client; test `send()` success and error propagation
- [x] 6.5 Run `pnpm test:cov` in `packages/mail` and confirm ≥80% on all metrics

## 7. Add Jest config to packages/database

- [x] 7.1 Add `devDependencies` to `packages/database/package.json`: `@nestjs/testing`, `jest`, `ts-jest`, `@types/jest`
- [x] 7.2 Add `jest` config block in `packages/database/package.json` with 80% coverage thresholds
- [x] 7.3 Add `"test"` and `"test:cov"` scripts to `packages/database/package.json`
- [x] 7.4 Create `packages/database/src/database.service.spec.ts` — test instantiation with mocked `ConfigService`
- [x] 7.5 Create `packages/database/src/database-seeder.service.spec.ts` — test `onModuleInit` runs seeders; test error handling
- [x] 7.6 Run `pnpm test:cov` in `packages/database` and confirm ≥80% on all metrics

## 8. Verify everything together

- [x] 8.1 Run `pnpm build` from the monorepo root and confirm no build errors
- [x] 8.2 Run `pnpm --filter auth test:cov`, `pnpm --filter notifications test:cov`, `pnpm --filter worker test:cov` and confirm all pass
- [x] 8.3 Run `pnpm test:cov` in `packages/shared`, `packages/mail`, `packages/database` and confirm all pass
