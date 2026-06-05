## 1. Shared Constants and Abstracts

- [ ] 1.1 Add `EMAIL_DLQ: 'email-queue:dlq'` to `packages/shared/src/constants/queues.ts`
- [ ] 1.2 Add `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE` to `packages/shared/src/constants/events.ts` (MESSAGE_PATTERNS)
- [ ] 1.3 Create `packages/shared/src/abstracts/base.dlq.service.ts` with `list`, `replay`, `replayAll`, `purge`, and `count` methods
- [ ] 1.4 Export `BaseDlqService` from the `@repo/shared` barrel (`packages/shared/src/abstracts/index.ts`)

## 2. QueueModule DLQ Auto-Registration

- [ ] 2.1 Update `QueueModule.registerQueues()` in `packages/shared/src/queue/queue.module.ts` to implicitly register the companion DLQ queue (e.g., `EMAIL` → also registers `EMAIL_DLQ`) with `removeOnFail: { count: 1000, age: 2592000 }` defaults
- [ ] 2.2 Verify `pnpm build` passes after shared package changes

## 3. EmailConsumer DLQ Wiring

- [ ] 3.1 Add `failedQueue: QUEUES.EMAIL_DLQ` to the `@Processor(QUEUES.EMAIL, { ... })` decorator in `apps/worker/src/consumer/email.consumer.ts`
- [ ] 3.2 Confirm `@OnWorkerEvent('failed')` still fires as before (Sentry + Prometheus unchanged)

## 4. Worker App DLQ Module

- [ ] 4.1 Create `apps/worker/src/dlq/email.dlq.service.ts` extending `BaseDlqService`, injecting `@InjectQueue(QUEUES.EMAIL_DLQ)` and `@InjectQueue(QUEUES.EMAIL)`
- [ ] 4.2 Create `apps/worker/src/dlq/dlq.controller.ts` with `@MessagePattern` handlers for `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE`
- [ ] 4.3 Create `apps/worker/src/dlq/dlq.module.ts` that imports `QueueModule.registerQueues([QUEUES.EMAIL])`, provides `EmailDlqService` and `DlqController`
- [ ] 4.4 Import `DlqModule` in `apps/worker/src/app.module.ts`

## 5. Bull Board UI

- [ ] 5.1 Add `@bull-board/api` and `@bull-board/nestjs` (and `@bull-board/express` adapter) to `apps/worker/package.json`
- [ ] 5.2 Create `apps/worker/src/bull-board/bull-board.module.ts` that registers both `email-queue` and `email-queue:dlq` with the Bull Board adapter
- [ ] 5.3 Mount Bull Board at `/admin/queues` in `apps/worker/src/main.ts` using `BootstrapUtil.setup` or direct app middleware
- [ ] 5.4 Protect `/admin/queues` with an admin role guard (validate session via `MESSAGE_PATTERNS.AUTH_AUTHENTICATE`, require `RoleEnum.ADMIN`)
- [ ] 5.5 Verify both queues are visible in Bull Board UI when worker is running

## 6. DLQ Observability

- [ ] 6.1 Update `apps/worker/src/metrics/queue-metrics.service.ts` to include `email-queue:dlq` (`waiting` state) in the existing `bullmq_queue_depth` Gauge — inject `@InjectQueue(QUEUES.EMAIL_DLQ)` and add it to the Gauge's `collect()` function
- [ ] 6.2 Document the Prometheus alert rule `BullMQDLQNonEmpty` in `apps/worker/README.md` or a `docs/alerting.md` file: `bullmq_queue_depth{queue=~".*:dlq", state="waiting"} > 0 for 5m`

## 7. Build and Tests

- [ ] 7.1 Run `pnpm build` — confirm all apps and packages compile without errors
- [ ] 7.2 Run `pnpm check-types` — confirm no type errors
- [ ] 7.3 Update `apps/worker/src/consumer/email.consumer.spec.ts` to assert that `@OnWorkerEvent('failed')` still fires after adding `failedQueue` option
- [ ] 7.4 Add unit tests for `BaseDlqService` (mock queues, test `replay` happy path and not-found case, test `purge`)
- [ ] 7.5 Run `pnpm lint` and resolve any issues
