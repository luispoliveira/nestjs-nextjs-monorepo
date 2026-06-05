## Why

All three NestJS apps (`auth`, `notifications`, `worker`) have 80% coverage thresholds configured in Jest but currently sit between 19–33% coverage, causing every `test:cov` run to fail. The `packages/shared`, `packages/mail`, and `packages/database` packages have no Jest configuration at all, leaving cross-cutting infrastructure completely untested.

## What Changes

- Add missing unit tests to `apps/auth` to reach ≥80% coverage (`LocalAuthService`, `AuthTrpcMiddleware`)
- Add missing unit tests to `apps/notifications` to reach ≥80% coverage (`AppController`, remaining `AppService` methods)
- Add missing unit tests to `apps/worker` to reach ≥80% coverage (`DlqController`, `EmailDlqService`, `QueueMetricsService`, `EmailConsumer` gaps)
- Add Jest configuration to `packages/shared` and write unit tests for shared infrastructure (`AllExceptionFilter`, `MicroserviceAuthGuard`, `CorrelationInterceptor`, `BaseProducer`, `LoggingInterceptor`, `HttpMetricsInterceptor`)
- Add Jest configuration to `packages/mail` and write unit tests for `MailService`
- Add Jest configuration to `packages/database` and write unit tests for `DatabaseService` and `DatabaseSeederService`

## Capabilities

### New Capabilities

- `unit-test-coverage-apps`: Unit test suites for all three NestJS apps meeting the existing 80% threshold
- `unit-test-infra-shared`: Jest setup and unit tests for `packages/shared` cross-cutting infrastructure
- `unit-test-infra-packages`: Jest setup and unit tests for `packages/mail` and `packages/database`

### Modified Capabilities

## Impact

- `apps/auth/src/` — new spec files for `LocalAuthService`, `AuthTrpcMiddleware`
- `apps/notifications/src/` — new spec file for `AppController`; expanded `AppService` spec
- `apps/worker/src/` — new spec files for `DlqController`, `EmailDlqService`, `QueueMetricsService`; expanded `EmailConsumer` spec
- `packages/shared/` — new `package.json` jest config, new `src/**/*.spec.ts` files
- `packages/mail/` — new `package.json` jest config, new `src/mail.service.spec.ts`
- `packages/database/` — new `package.json` jest config, new spec files for `DatabaseService`, `DatabaseSeederService`
- No runtime code changes; test-only additions
