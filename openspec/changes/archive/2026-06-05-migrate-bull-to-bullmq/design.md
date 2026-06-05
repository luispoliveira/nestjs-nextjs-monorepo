## Context

The monorepo currently uses `@nestjs/bull` (Bull v4) for background job processing. Bull v4 is in maintenance-only mode with no new features being developed. BullMQ is its TypeScript-native successor, built from scratch with better type safety, job flows, native cron scheduling, and active maintenance.

The queue infrastructure is contained in three files within `packages/shared` (producer abstraction, concrete email producer, queue module) and one consumer in `apps/worker`. The public-facing API — job names, queue names, producer method signatures — remains unchanged.

## Goals / Non-Goals

**Goals:**
- Replace `bull` + `@nestjs/bull` with `bullmq` + `@nestjs/bullmq` across all affected packages
- Preserve identical external behavior: same queue names, job patterns, retry config, Sentry error reporting
- Migrate the consumer to the `WorkerHost` pattern required by BullMQ
- Update `CLAUDE.md` to reflect BullMQ as the queue library

**Non-Goals:**
- Introducing new job types or queues (that is a separate change)
- Changing the Redis connection configuration
- Adopting BullMQ-specific features like job flows or rate limiting (can be done incrementally after migration)

## Decisions

### 1. Consumer pattern: `WorkerHost` over `@Process()` decorators

Bull v4 allows one `@Process(jobName)` decorator per method. BullMQ uses a single `process()` method with dispatch via `switch (job.name)`. The private handler methods remain, only the entry point changes.

**Rationale**: `WorkerHost` is the only supported consumer pattern in `@nestjs/bullmq`. The `@Process` decorator does not exist in BullMQ.

### 2. Keep `BaseProducer` abstraction

The `BaseProducer` class wraps correlation ID injection. The only change needed is the `Queue` import: `from 'bull'` → `from 'bullmq'`. The `queue.add(name, data)` signature is identical in BullMQ.

**Rationale**: Keeps the abstraction intact and minimises diff size.

### 3. `QueueModule` registration stays identical

`BullModule.forRootAsync()` and `BullModule.registerQueue()` have the same API in `@nestjs/bullmq`. The `defaultJobOptions` shape (attempts, backoff, removeOnComplete, removeOnFail) is also compatible.

**Rationale**: Zero configuration changes needed.

### 4. Error handling: `@OnWorkerEvent('failed')`

Bull v4 uses `@OnQueueFailed()` method decorator. In `@nestjs/bullmq` the equivalent is `@OnWorkerEvent('failed')` — `WorkerHost` does not expose an overridable `onFailed` lifecycle method (verified during implementation; TS4113).

**Rationale**: Functionally equivalent — same hook point, same signature `(job, error)`.

## Risks / Trade-offs

- **Redis key format**: BullMQ uses a different internal Redis key structure than Bull v4. Jobs enqueued while Bull v4 is running will not be visible to the BullMQ worker. → **Mitigation**: Drain the email queue to zero before deploying (or accept that in-flight jobs are lost — they will be retried by the upstream trigger if needed, since all email jobs are event-driven).

- **`bullmq` major version**: BullMQ is on v5.x. Future major bumps may require migrations. → **Mitigation**: Pin to `^5` (compatible patch/minor updates); track changelog on upgrades.

- **`@nestjs/bullmq` version alignment**: Must match the `@nestjs/bull` peer version pattern (v11.x for NestJS 11). → **Mitigation**: Install `@nestjs/bullmq@^11` to stay aligned with the monorepo's NestJS version.

## Migration Plan

1. Update `packages/shared/package.json`: swap peer dependencies
2. Update `apps/worker/package.json`: swap dependencies
3. Run `pnpm install` to update lockfile
4. Update `packages/shared/src/abstracts/base.producer.ts`
5. Update `packages/shared/src/queue/producers/email.producer.ts`
6. Update `packages/shared/src/queue/queue.module.ts`
7. Update `apps/worker/src/consumer/email.consumer.ts`
8. Update `CLAUDE.md` — remove Bull v4 restriction
9. Run `pnpm build && pnpm check-types` to verify
10. Drain the email queue before deploying to any environment with existing jobs

**Rollback**: revert the five files and `pnpm install`. No database or schema changes.

## Open Questions

- None — migration scope is fully bounded.
