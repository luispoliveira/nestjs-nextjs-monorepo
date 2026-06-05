## 1. Dependencies

- [x] 1.1 Remove `@nestjs/bull` and `bull` from `packages/shared/package.json` peerDependencies; add `@nestjs/bullmq` and `bullmq`
- [x] 1.2 Remove `@nestjs/bull` and `bull` from `apps/worker/package.json` dependencies; add `@nestjs/bullmq` and `bullmq`
- [x] 1.3 Run `pnpm install` to update the lockfile

## 2. Shared Package — Producer Abstraction

- [x] 2.1 Update `packages/shared/src/abstracts/base.producer.ts`: change `Queue` import from `'bull'` to `'bullmq'`
- [x] 2.2 Update `packages/shared/src/queue/producers/email.producer.ts`: change `@InjectQueue` import from `@nestjs/bull` to `@nestjs/bullmq`; change `bull.Queue` type to `Queue` from `'bullmq'`
- [x] 2.3 Update `packages/shared/src/queue/queue.module.ts`: change `BullModule` import from `@nestjs/bull` to `@nestjs/bullmq`

## 3. Worker App — Consumer

- [x] 3.1 Update `apps/worker/src/consumer/email.consumer.ts`: change `@Processor`, `@Process`, `@OnQueueFailed` imports from `@nestjs/bull` to `@nestjs/bullmq`; change `bull.Job` type to `Job` from `'bullmq'`
- [x] 3.2 Extend `WorkerHost` in `EmailConsumer` and implement a single `async process(job: Job)` method with `switch (job.name)` dispatching to the existing handler methods (kept as private)
- [x] 3.3 Replace `@OnQueueFailed()` decorator with `@OnWorkerEvent('failed')` method (note: `WorkerHost` has no overridable `onFailed` — design updated)

## 4. Documentation

- [x] 4.1 Update `CLAUDE.md`: replace Bull v4 references with BullMQ; remove the "Do not install or import from bullmq" prohibition; update the queue section guidance

## 5. Verification

- [x] 5.1 Run `pnpm check-types` — zero type errors (only `web` defines this script; NestJS apps are type-checked via `nest build` in 5.2)
- [x] 5.2 Run `pnpm build` — all packages and apps build successfully (11/11 tasks)
- [x] 5.3 Run `pnpm lint` — no lint errors introduced (lint fails on a clean tree too: pre-existing ESLint 10 ConfigError `Cannot redefine plugin "@typescript-eslint"`, unrelated to this change)
