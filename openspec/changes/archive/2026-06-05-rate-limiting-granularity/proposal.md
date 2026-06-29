## Why

The current `ThrottlerModule` configuration applies a single 10 req/60s limit keyed by IP address, but the guard is never registered so no routes are actually throttled. When active, IP-based limiting breaks behind NAT and load balancers (multiple users share one IP), cannot differentiate authenticated users, and state is local to each app instance making horizontal scaling incorrect. The API app (`apps/api`) needs per-user rate limiting backed by Redis to be both accurate and deployment-safe.

## What Changes

- Add optional Redis-backed throttler storage to `SharedModule.register()` — falls back to in-memory when no Redis URL is provided
- Create `CustomThrottlerGuard` in `packages/shared` that keys on `user.id` when the request is authenticated, falling back to client IP for unauthenticated requests
- The generated key has no route component — one global bucket per user, shared across all throttled endpoints
- Add `THROTTLE_TIERS` constant to `packages/shared` with named tiers (`default`, `strict`) — all limit values centralised, no magic numbers in controllers
- Add `@RateLimit(tier)` composite decorator to `packages/shared` — single decorator combining `@UseGuards(CustomThrottlerGuard)` and `@Throttle()`, applied opt-in per controller
- Add `trustProxy` option to `BootstrapUtil.setup()` so `req.ip` resolves correctly behind Nginx
- Wire `trustProxy: true` and `throttlerRedisUrl` in `apps/api`

## Capabilities

### New Capabilities

- `per-user-rate-limiting`: Per-user global rate limiting with Redis-backed storage, named tier configuration, and a single opt-in decorator for controllers

### Modified Capabilities

- (none — existing `throttlerOptions` schema is extended non-breakingly; no routes are currently throttled)

## Impact

- **`packages/shared`**: `SharedModule`, `BootstrapUtil`, new guard `CustomThrottlerGuard`, new decorator `@RateLimit`, new constant `THROTTLE_TIERS`
- **`apps/api`**: `AppModule` (pass `throttlerRedisUrl`), `main.ts` (`trustProxy: true`) — controllers gain `@RateLimit()` decorator
- **New dependency**: `@nest-lab/throttler-storage-redis` in `packages/shared`
- **No breaking changes**: existing `throttlerOptions` parameter in `SharedModule.register()` is preserved; Redis storage is opt-in via new `throttlerRedisUrl` param
