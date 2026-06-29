# Template Improvements Backlog

Identified during initial template audit (2026-06-05). Projects using this template are strictly backend — the `apps/web` Next.js app is optional and can be ignored.

---

## High Priority

### API Key Authentication

Machine-to-machine auth for B2B integrations and service tokens. The current `better-auth` setup is session/cookie oriented (web). Backend APIs need stateless auth: API keys or opaque service tokens validated via a dedicated guard.

### Test Infrastructure

Only 3 auto-generated controller spec files exist. Missing:

- Integration test setup (real DB, test containers)
- Test factories / fixtures (e.g. `@faker-js/faker` + factory pattern)
- Database seeding utilities for tests
- E2E test setup (`jest-e2e.json` exists but no tests)

### Cursor-based Pagination

`PaginatedUtil` uses offset/limit pagination. For large datasets this degrades. Add cursor-based pagination as an alternative in `@repo/shared` (works well with Prisma's `cursor` + `take`).

---

## Medium Priority

### Circuit Breaker

Inter-service Redis calls have no resilience pattern. If `auth` is slow, `api` blocks indefinitely. Add circuit breaker support (e.g. `opossum`) to `BasePublisher` or the microservice client wrappers.

### Distributed Tracing (OpenTelemetry)

Correlation IDs propagate via `nestjs-cls` but there is no trace context for cross-service requests. OpenTelemetry with a Jaeger or OTLP exporter would give full request traces across `auth → api → notifications → worker`.

### Dedicated Audit Log

`LoggingInterceptor` writes HTTP request/response to MongoDB (30-day TTL). Business-level audit events (who changed what, when) need a separate, permanent store. Add an `AuditModule` with a dedicated Prisma model or append-only collection.

---

## Low Priority

### Kubernetes Manifests

Only Docker Compose exists for infra. Add Helm chart or raw K8s manifests (Deployments, Services, ConfigMaps, Secrets) for production deployments.

### Feature Flags

No mechanism for gradual rollouts or A/B testing. Options: simple environment-variable flags in `@repo/shared/constants`, or an integration with a flag service (Unleash, Flagsmith, PostHog).

### Multitenancy Patterns

No tenant isolation model. If projects require multi-tenant data, a row-level security pattern (Prisma middleware + `tenantId` on every model) needs to be established before the first model is written.
