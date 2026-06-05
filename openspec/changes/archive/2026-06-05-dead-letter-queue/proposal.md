## Why

Failed BullMQ jobs are currently retained in Redis capped at 500 entries — once that cap is hit the oldest failures are silently evicted, making them unrecoverable. There is no dedicated holding area, no replay path, and no alerting on accumulation. This creates a silent data-loss window for transactional jobs (email delivery) that should never be silently dropped.

## What Changes

- Add a Dead Letter Queue (DLQ) as a companion to every BullMQ queue: permanently failed jobs are routed to `<queue-name>:dlq` instead of being silently capped and evicted.
- Introduce a generic `BaseDlqService` abstraction in `@repo/shared` for list, replay, purge, and count operations — reusable across all present and future queues.
- Wire the email queue DLQ first: `EmailConsumer` gains `failedQueue: QUEUES.EMAIL_DLQ` and a concrete `EmailDlqService`.
- Expose DLQ management via two channels:
  - **Bull Board UI** mounted at `/admin/queues` in the worker app (direct queue inspection and manual replay).
  - **Microservice message patterns** (`DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE`) so the auth app's tRPC layer can drive DLQ operations from the web dashboard.
- Extend `QueueMetricsService` to track DLQ depth alongside the main queue states — enabling a Prometheus alert when the DLQ is non-empty for > 5 minutes.
- DLQ jobs are retained for 30 days (consistent with the existing MongoDB log TTL) and capped at 1 000 entries. Jobs contain PII (email addresses) so indefinite retention is not acceptable.

## Capabilities

### New Capabilities

- `dead-letter-queue`: Core DLQ infrastructure — queue constants, `BaseDlqService`, `QueueModule` auto-registration of companion DLQ queues, and `failedQueue` wiring on `EmailConsumer`.
- `dlq-management-api`: Management surface — Bull Board UI in the worker app and microservice message handlers (`DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE`) reachable from the auth tRPC layer.
- `dlq-observability`: Prometheus depth gauge for DLQ queues and the corresponding alert rule; Sentry coverage is already present via the existing `@OnWorkerEvent('failed')` hook.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. The existing email job processing flow is unchanged — only the failure path is extended. -->

## Impact

- **`packages/shared/src/constants/queues.ts`** — add `EMAIL_DLQ` constant.
- **`packages/shared/src/constants/events.ts`** — add `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE` message patterns.
- **`packages/shared/src/abstracts/base.dlq.service.ts`** — new abstract service.
- **`packages/shared/src/queue/queue.module.ts`** — `registerQueues()` implicitly registers companion DLQ queues.
- **`apps/worker/src/consumer/email.consumer.ts`** — add `failedQueue` Worker option.
- **`apps/worker/src/dlq/`** — new module: `EmailDlqService`, `DlqController`, `DlqModule`.
- **`apps/worker/src/metrics/queue-metrics.service.ts`** — add DLQ queue to the depth Gauge.
- **`apps/worker`** — add `@bull-board/api` + `@bull-board/nestjs` dependencies.
- **No schema migrations** — DLQ is purely Redis-backed.
- **No breaking changes** — existing producer/consumer interfaces are unchanged.
