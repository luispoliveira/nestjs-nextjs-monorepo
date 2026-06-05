## Context

The worker app consumes jobs from BullMQ queues backed by Redis. Failed jobs (those exhausting all retry attempts) are currently retained in Redis's `failed` sorted set, capped at 500 entries via `removeOnFail: 500` in the global `QueueModule` configuration. Once the cap is exceeded, the oldest entries are silently evicted — there is no replay mechanism and no durable audit trail beyond what Sentry captures.

The `@OnWorkerEvent('failed')` hook in `EmailConsumer` already fires Sentry exceptions and increments a Prometheus counter per failure. The gap is preservation of job data after exhaustion and a structured path to replay.

## Goals / Non-Goals

**Goals:**
- Route permanently failed jobs to a dedicated DLQ queue per source queue (`email-queue` → `email-queue:dlq`).
- Provide a generic `BaseDlqService` (list, replay, purge, count) so future queues get DLQ support at zero additional design cost.
- Expose DLQ inspection and replay via Bull Board UI (worker app) and via microservice message patterns (`DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE`) callable from the auth tRPC layer.
- Track DLQ depth in Prometheus and alert when non-empty for > 5 minutes.
- Enforce 30-day / 1 000-job retention on DLQ data (PII compliance).

**Non-Goals:**
- Automatic replay (DLQ jobs are intentionally held until a human decides to replay).
- DLQ for the Redis microservice transport (only BullMQ queues).
- UI changes to the `apps/web` dashboard (tRPC procedures exposed; UI wiring is a separate task).
- Migration of existing `failed` set entries to the new DLQ.

## Decisions

### 1. Naming convention: `<queue>:dlq` suffix

DLQ queues are named by appending `:dlq` to the original queue name (e.g., `email-queue:dlq`). This keeps related queues adjacent in Bull Board and Redis tooling, and makes the relationship self-documenting.

**Alternative considered**: `dlq-<queue>` prefix — rejected; suffix is more conventional in BullMQ community examples and keeps Bull Board grouping cleaner.

### 2. No processor on the DLQ queue

The DLQ has no `@Processor` / `WorkerHost`. Jobs land in `waiting` state and stay there until explicitly replayed or purged. This enforces the "human in the loop" requirement for replay decisions.

**Alternative considered**: A no-op processor that just logs and alerts — rejected; an unprocessed queue is semantically clearer and avoids accidental auto-retry.

### 3. `QueueModule.registerQueues()` implicitly registers companion DLQ queues

When a caller registers `[QUEUES.EMAIL]`, `QueueModule` internally also registers `QUEUES.EMAIL_DLQ`. Callers do not need to know about or enumerate DLQ queues.

**Alternative considered**: Explicit opt-in registration — rejected; it would allow queues to exist without a DLQ, undermining the convention.

### 4. Replay via microservice message patterns, not direct REST

DLQ operations are exposed in the worker app via `@MessagePattern(MESSAGE_PATTERNS.DLQ_LIST / DLQ_REPLAY / DLQ_PURGE)`. The auth app's tRPC layer calls these via the existing Redis transport — consistent with `NotificationsPublisher` and `MicroserviceUtil` patterns already in the codebase.

**Alternative considered**: REST controller on worker app — viable but introduces a new HTTP surface on a service currently without one, inconsistent with the Redis-first microservice pattern.

### 5. Replay semantics: re-enqueue + remove, no mutation

`DlqService.replay(jobId)` adds a fresh copy of the job (same name, same data) to the original queue, then removes the DLQ entry. The replayed job gets a new ID and a clean attempt counter. No mutation of the original DLQ job.

**Alternative considered**: `job.retry()` BullMQ API — moves the job back to the original queue's `failed` set rather than `waiting`, which does not guarantee re-processing. Rejected for predictability.

### 6. Retention: 30 days / 1 000 jobs

Implemented via BullMQ's `removeOnFail: { count: 1000, age: 2592000 }` on the DLQ's default job options in `QueueModule`. Consistent with the MongoDB `LoggingInterceptor` TTL already established in the project.

### 7. Bull Board behind admin role guard

The Bull Board adapter is mounted at `/admin/queues` in the worker app. The route is protected by a NestJS guard that validates the session via `MESSAGE_PATTERNS.AUTH_AUTHENTICATE` (same as `MicroserviceAuthGuard`) and requires `RoleEnum.ADMIN`. No anonymous access.

## Risks / Trade-offs

- **DLQ accumulation without operator awareness** → Mitigation: Prometheus alert `bullmq_queue_depth{queue="email-queue:dlq", state="waiting"} > 0 for 5m`. This fires even if Sentry is silenced or rate-limited.

- **PII in DLQ jobs (email addresses)** → Mitigation: Bull Board behind admin auth, tRPC DLQ procedures behind role check, 30-day hard TTL.

- **Stale job replay (e.g., expired password-reset link)** → Mitigation: Replay is always human-triggered. Operators should review job data in Bull Board before replaying. The consumer re-validates payload via Zod — a stale job will produce a mail delivery, not a crash.

- **DLQ queue registered but never consumed** → This is intentional and expected; Redis will hold the `waiting` jobs until TTL evicts them. No additional memory pressure beyond the 1 000-job cap.

- **`removeOnFail: 500` on the original email-queue becomes redundant** → With `failedQueue` set, jobs move to the DLQ before they would hit the retention cap. The `500` cap on the source queue becomes a backstop for any edge case where the DLQ routing fails. Keep it as-is.

## Migration Plan

1. Deploy `@repo/shared` changes (constants, `BaseDlqService`, `QueueModule` update) as a build-time dependency update — no runtime impact until worker is redeployed.
2. Deploy worker app with `failedQueue` on `EmailConsumer` and new `DlqModule`. From this point, newly failed jobs route to `email-queue:dlq`; existing entries in the `failed` set are unaffected and will age out normally.
3. Mount Bull Board and verify `email-queue:dlq` appears in the UI.
4. Add Prometheus alert rule to Grafana/Alertmanager config.
5. Deploy auth app changes (message patterns, tRPC procedures) — no rollback needed; patterns are additive.

Rollback: remove `failedQueue` option from `@Processor` and redeploy worker. Jobs resume accumulating in the `failed` set as before.

## Open Questions

- Should the Bull Board route be on the worker app (`/admin/queues`) or moved to the auth app which already handles HTTP auth? Worker app currently has no HTTP surface beyond health — this adds one. Recommended: keep in worker (queues live there); auth is available via the microservice guard.
- As future queues are added (e.g., `notifications-queue`), should `QueueMetricsService` auto-discover registered DLQ queues, or should each service extend its own metrics setup? Recommendation: each service owns its metrics — simple and explicit.
