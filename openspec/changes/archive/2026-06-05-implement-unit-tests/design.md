## Context

Three NestJS apps (`auth`, `notifications`, `worker`) each have `coverageThreshold` set to 80% in their Jest configs but are currently at 19–33% — every `pnpm test:cov` run exits non-zero. The `packages/shared`, `packages/mail`, and `packages/database` packages have no Jest config. No runtime behaviour is changing; this is entirely test-side work.

Known constraints:
- `@thallesp/nestjs-better-auth` is ESM-only. Files that import it must use a top-level `jest.mock()` factory to avoid CJS/ESM parse errors (pattern already established in `apps/auth/src/auth.controller.spec.ts`).
- `prom-client` uses a global metric registry. `new Histogram()/Counter()` at module scope will throw `"A metric with that name is already registered"` if two test files import the same module. Tests for `QueueMetricsService` and `HttpMetricsInterceptor` must mock `prom-client` entirely.
- `packages/shared` has no Jest config today. It uses `peerDependencies` for NestJS; any Jest config needs to install NestJS testing deps (`@nestjs/testing`, `ts-jest`, etc.) as `devDependencies`.

## Goals / Non-Goals

**Goals:**
- All three apps pass `pnpm test:cov` (≥80% statements, branches, functions, lines)
- `packages/shared`, `packages/mail`, `packages/database` each have a working `pnpm test` / `pnpm test:cov` script
- Every new spec follows existing patterns: `NestJS Test.createTestingModule`, manual mocks, AAA structure

**Non-Goals:**
- Integration or E2E tests (apps already have separate `test:integration` / `test:e2e` scripts)
- Testing NestJS framework internals (module wiring, decorator application)
- Achieving >80% on packages — 80% is the target; exceeding it is not a goal

## Decisions

### D1: ESM-only mocking via jest.mock() factory

`@thallesp/nestjs-better-auth` cannot be `require()`'d by Jest's CJS transform. Full module replacement via `jest.mock('@thallesp/nestjs-better-auth', () => ({ ... }))` at the top of each affected spec file is the correct fix. The mock replaces the module entirely — decorators are stubbed as no-op HOFs.

**Alternatives considered:** Using `NODE_OPTIONS=--experimental-vm-modules` + native ESM Jest. Rejected because it requires changes to tsconfig and jest transform config across all packages and is not the established pattern in this repo.

### D2: prom-client global registry — mock the module

`jest.mock('prom-client')` replaces `Histogram`, `Counter`, and `Gauge` constructors with jest fns. This means `QueueMetricsService` and `HttpMetricsInterceptor` tests verify *behavior* (was `observe()` called with the right labels?) not that prom-client wired up correctly. The alternative — calling `register.clear()` in `beforeEach` — is fragile and order-dependent.

### D3: packages/shared jest config pattern

`packages/shared` will mirror the app packages: `jest` block in `package.json`, `rootDir: "src"`, `testRegex: "**/*.spec.ts"`, `ts-jest` transform pointing at `tsconfig.json`. 80% coverage threshold applied. `devDependencies` will add `@nestjs/testing`, `ts-jest`, `@types/jest`, `jest`.

`packages/mail` and `packages/database` follow the same pattern.

### D4: Test file location

All spec files live next to their source (`src/foo.service.spec.ts` beside `src/foo.service.ts`). This matches every existing spec in the repo. No `__tests__/` directories.

### D5: Observable-returning guard testing

`MicroserviceAuthGuard.canActivate()` returns `Observable<boolean>`. Tests will use `firstValueFrom()` from `rxjs` to unwrap the observable in a `await`-friendly way, and mock `ClientProxy` with `{ send: jest.fn().mockReturnValue(of(user)) }`.

## Risks / Trade-offs

- **prom-client mock gaps** → If `QueueMetricsService.onModuleInit()` logic changes to depend on real prom-client behavior, the mocked tests won't catch it. Mitigation: keep the mock simple and verify the observable side-effects (method calls), not internal prom state.
- **Better-auth mock drift** → If `@thallesp/nestjs-better-auth` adds new exports used by `LocalAuthService`, the manual mock factory will need updating. Mitigation: keep the mock factory minimal (only mock what's actually used).
- **Coverage counting for thin wrappers** → `EmailDlqService` is 7 lines; its constructor is enough to hit 100%. Counting on it to carry coverage weight is fine but won't catch logic bugs (there are none to catch).

## Open Questions

- Should `packages/database` tests mock Prisma client (using `jest-mock-extended`) or stub at the `DatabaseService` level? The existing `EmailConsumer` and `BaseDlqService` tests mock at the service boundary, not the DB layer — that same approach applies here.
