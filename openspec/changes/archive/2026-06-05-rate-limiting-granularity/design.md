## Context

The monorepo currently configures `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` inside `SharedModule`, but no `ThrottlerGuard` is registered as `APP_GUARD` and no `@Throttle()` decorators are in use — rate limiting is effectively inert. The `apps/api` service is the primary HTTP surface, sitting behind Nginx with `MicroserviceAuthGuard` as its global `APP_GUARD`. BullMQ already uses a Redis instance via `ioredis`. The stack is multi-instance by design, so any throttle state must be shared across instances.

## Goals / Non-Goals

**Goals:**
- Per-user global rate limiting (one bucket per user, shared across all throttled endpoints) for authenticated requests
- IP-based fallback for unauthenticated requests to throttled routes (future-proofing for public endpoints)
- Optional Redis storage — in-memory fallback in development/test
- Named tiers (`default`, `strict`) configured once, referenced by name in controllers
- Single opt-in decorator `@RateLimit(tier)` — no boilerplate per controller
- Correct client IP resolution behind Nginx via `trustProxy` in `BootstrapUtil`

**Non-Goals:**
- Per-route rate limiting (separate buckets per endpoint)
- Rate limiting in `apps/auth` (handled by better-auth internally)
- Rate limiting in `apps/worker` or `apps/notifications` (microservice transports, not HTTP)
- API key-based rate limiting
- Dynamic tier configuration at runtime

## Decisions

### D1: Global per-user bucket (no route in key)

**Decision**: The throttle key is `md5("{tierName}-{userId}")` — no controller or handler name included.

**Rationale**: A user's total request volume is what matters for API fairness, not per-endpoint volume. Per-route limiting requires either many named throttlers (one per endpoint) or complex metadata, adding significant cognitive overhead. Global buckets are simpler to reason about, easier to configure, and cover the primary concern (preventing abuse of the API as a whole).

**Alternative considered**: Per-route keys (standard `ThrottlerGuard` default). Rejected — over-engineered for the current requirement, and a user could still hammer many endpoints at full rate.

### D2: `@RateLimit(tier)` composite decorator

**Decision**: A single `@RateLimit('default' | 'strict')` decorator that internally applies `@UseGuards(CustomThrottlerGuard)` and `@Throttle({ default: THROTTLE_TIERS[tier] })`.

**Rationale**: Keeps the controller API minimal — one import, one decorator. Prevents the error of forgetting `@UseGuards` when adding `@Throttle`. Tier values live only in `THROTTLE_TIERS` constant, not scattered across controllers.

**Alternative considered**: Separate `@UseGuards()` + `@Throttle()` on each controller. Rejected — error-prone, verbose, and duplicates tier values.

### D3: Optional Redis storage via `throttlerRedisUrl` in `SharedModule.register()`

**Decision**: `SharedModule.register()` accepts an optional `throttlerRedisUrl` string. When provided, `ThrottlerModule.forRootAsync()` uses `ThrottlerStorageRedisService`; otherwise in-memory storage is used.

**Rationale**: Allows local development without a Redis dependency while ensuring production correctness. Reuses the same Redis instance as BullMQ — no new infrastructure.

**Alternative considered**: Always require Redis. Rejected — breaks local dev and test environments unnecessarily.

### D4: Guard execution order — auth before throttle

**Decision**: `CustomThrottlerGuard` is applied via `@UseGuards()` on controllers (after `APP_GUARD`), not as `APP_GUARD` itself.

**Rationale**: `MicroserviceAuthGuard` is registered as `APP_GUARD` and runs first, populating `request.user`. When `CustomThrottlerGuard` runs via `@UseGuards()`, `request.user` is already populated, enabling accurate user-keyed throttling. This order falls out naturally from NestJS guard execution rules.

**Alternative considered**: Registering `CustomThrottlerGuard` as `APP_GUARD`. Rejected — would run before auth, forcing IP fallback on all requests; also breaks opt-in semantics.

### D5: `trustProxy` as an opt-in flag in `BootstrapUtil`

**Decision**: Add `trustProxy?: boolean` to `BootstrapUtil.setup()` config. When `true`, sets `app.getHttpAdapter().getInstance().set('trust proxy', 1)` on the underlying Express instance.

**Rationale**: Trust proxy must be set before any request processing. `BootstrapUtil` is the canonical place for Express-level configuration. Making it opt-in avoids incorrectly trusting `X-Forwarded-For` in environments without a proxy (e.g., local dev).

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Redis connection failure at startup causes ThrottlerModule init to fail | Use lazy connection / catch errors; log warning and fall back to in-memory |
| Global bucket means a single aggressive endpoint cannot be isolated | Acceptable for now; per-route can be added later as a named tier without breaking the current API |
| `request.user` shape depends on `MicroserviceAuthGuard` response — if shape changes, key extraction breaks | `CustomThrottlerGuard.getTracker()` should use optional chaining; log a warning on missing ID rather than throwing |
| `@Throttle({ default: ... })` only overrides the `default` named throttler — if multiple throttlers are registered, others still apply | Only register one throttler per tier in `forRoot`, not multiple; keep `THROTTLE_TIERS` as constants, not separate `forRoot` entries |

## Migration Plan

1. Add `@nest-lab/throttler-storage-redis` to `packages/shared`
2. Implement `CustomThrottlerGuard`, `@RateLimit`, `THROTTLE_TIERS` in `packages/shared`
3. Update `SharedModule.register()` — `ThrottlerModule.forRootAsync()` with optional Redis
4. Add `trustProxy` to `BootstrapUtil`
5. Update `apps/api` — wire `throttlerRedisUrl` + `trustProxy: true`
6. Add `@RateLimit('default')` to existing API controllers

**Rollback**: Remove `@RateLimit()` decorators from controllers — zero production impact since the guard is opt-in. No database migrations. No infrastructure changes (Redis was already in use).

## Open Questions

- What should the `default` and `strict` tier limits be? (Current placeholder: `default` = 60/min, `strict` = 10/min — confirm before implementation)
- Should throttle-exceeded responses include `Retry-After` headers? (`@nestjs/throttler` does this by default via `ThrottlerException` — verify acceptable)
