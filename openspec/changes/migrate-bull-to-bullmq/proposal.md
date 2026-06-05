## Why

Bull v4 is in maintenance-only mode — the ecosystem has fully migrated to BullMQ, its TypeScript-native successor. Starting new projects on Bull v4 means inheriting tech debt from day one, and missing features (job flows, native cron scheduling, per-queue rate limiting) that BullMQ provides out of the box.

## What Changes

- Replace `@nestjs/bull` + `bull` with `@nestjs/bullmq` + `bullmq` in `packages/shared` and `apps/worker`
- Migrate `BaseProducer` to use BullMQ's `Queue` type
- Migrate `EmailProducer` to use `@InjectQueue` from `@nestjs/bullmq`
- Migrate `QueueModule` to use `BullModule` from `@nestjs/bullmq`
- Migrate `EmailConsumer` from the `@Process()` per-method pattern to `WorkerHost.process()` with a `switch` on `job.name`
- Remove the explicit prohibition on BullMQ from `CLAUDE.md` and update queue documentation

## Capabilities

### New Capabilities

- `background-job-processing`: Queue infrastructure for background jobs, now powered by BullMQ. Covers producer abstraction, consumer worker pattern, Redis connection, retry/backoff configuration, and error reporting to Sentry.

### Modified Capabilities

<!-- No existing specs are changing behavioral requirements — this is a pure implementation swap. -->

## Impact

**Dependencies**

- `packages/shared/package.json`: remove `@nestjs/bull`, `bull`; add `@nestjs/bullmq`, `bullmq`
- `apps/worker/package.json`: same

**Files changed**

- `packages/shared/src/abstracts/base.producer.ts`
- `packages/shared/src/queue/producers/email.producer.ts`
- `packages/shared/src/queue/queue.module.ts`
- `apps/worker/src/consumer/email.consumer.ts`
- `CLAUDE.md` (remove Bull v4 restriction, update queue guidance)

**External behavior**: unchanged — same queue names, same job patterns, same Redis connection, same retry configuration. Producers and consumers are internal to the template infrastructure.

**Breaking**: none for consumers of the template (the `EmailProducer` public API is identical).
