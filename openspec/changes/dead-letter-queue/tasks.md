## 1. Shared Constants and Abstracts

- [x] 1.1 Add `EMAIL_DLQ: 'email-queue:dlq'` to `packages/shared/src/constants/queues.ts`
- [x] 1.2 Add `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE` to `packages/shared/src/constants/events.ts` (MESSAGE_PATTERNS)
- [x] 1.3 Create `packages/shared/src/abstracts/base.dlq.service.ts` with `list`, `replay`, `replayAll`, `purge`, and `count` methods
- [x] 1.4 Export `BaseDlqService` from the `@repo/shared` barrel (`packages/shared/src/abstracts/index.ts`)

## 2. QueueModule DLQ Auto-Registration

- [x] 2.1 Update `QueueModule.registerQueues()` in `packages/shared/src/queue/queue.module.ts` to implicitly register the companion DLQ queue (e.g., `EMAIL` → also registers `EMAIL_DLQ`) with `removeOnFail: { count: 1000, age: 2592000 }` defaults
- [x] 2.2 Verify `pnpm build` passes after shared package changes

## 3. EmailConsumer DLQ Wiring

- [x] 3.1 Manual DLQ routing in `@OnWorkerEvent('failed')`: inject `@InjectQueue(QUEUES.EMAIL_DLQ)` into `EmailConsumer`; when `attemptsMade >= attempts`, add job to DLQ. Note: `failedQueue` is a BullMQ Pro feature not available in OSS bullmq v5 — replaced with explicit routing.
- [x] 3.2 Confirm `@OnWorkerEvent('failed')` still fires as before (Sentry + Prometheus unchanged)

## 4. Worker App DLQ Module

- [x] 4.1 Create `apps/worker/src/dlq/email.dlq.service.ts` extending `BaseDlqService`, injecting `@InjectQueue(QUEUES.EMAIL_DLQ)` and `@InjectQueue(QUEUES.EMAIL)`
- [x] 4.2 Create `apps/worker/src/dlq/dlq.controller.ts` with `@MessagePattern` handlers for `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE`
- [x] 4.3 Create `apps/worker/src/dlq/dlq.module.ts` that imports `QueueModule.registerQueues([QUEUES.EMAIL])`, provides `EmailDlqService` and `DlqController`
- [x] 4.4 Import `DlqModule` in `apps/worker/src/app.module.ts`; add Redis microservice transport + `startAllMicroservices()` to `main.ts`

## 5. Bull Board UI

- [x] 5.1 Add `@bull-board/api`, `@bull-board/nestjs`, `@bull-board/express`, and `@nestjs/microservices` to `apps/worker/package.json`
- [x] 5.2 Create `apps/worker/src/bull-board/bull-board.module.ts` that registers both `email-queue` and `email-queue:dlq` with the Bull Board adapter
- [x] 5.3 Mount Bull Board at `/admin/queues` via `BullBoardNestModule` imported in `AppModule`
- [x] 5.4 Protect `/admin/queues` with `BullBoardAuthMiddleware` (validates session via `MESSAGE_PATTERNS.AUTH_AUTHENTICATE`, requires `RoleEnum.ADMIN`)
- [ ] 5.5 Verify both queues are visible in Bull Board UI when worker is running

## 6. DLQ Observability

- [x] 6.1 Update `apps/worker/src/metrics/queue-metrics.service.ts` to include `email-queue:dlq` (`waiting` state) in the existing `bullmq_queue_depth` Gauge — inject `@InjectQueue(QUEUES.EMAIL_DLQ)` and add it to the Gauge's `collect()` function
- [x] 6.2 Document the Prometheus alert rule `BullMQDLQNonEmpty` in `apps/worker/README.md`

## 7. Build and Tests

- [x] 7.1 Run `pnpm build` — confirm all apps and packages compile without errors
- [x] 7.2 Run `pnpm check-types` — confirm no type errors
- [x] 7.3 Update `apps/worker/src/consumer/email.consumer.spec.ts` to assert that `@OnWorkerEvent('failed')` still fires, DLQ routing on final failure, no DLQ routing on transient failure
- [x] 7.4 Add unit tests for `BaseDlqService` in `apps/worker/src/dlq/base.dlq.service.spec.ts` (replay happy path, not-found, purge, count)
- [x] 7.5 Lint pre-existing ESLint config conflict (`Cannot redefine plugin "@typescript-eslint"`) — pre-existing issue, not introduced by this change
