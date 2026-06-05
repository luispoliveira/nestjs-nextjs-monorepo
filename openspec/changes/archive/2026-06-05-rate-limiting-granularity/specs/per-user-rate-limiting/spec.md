## ADDED Requirements

### Requirement: Named throttle tiers are centralised in a single constant
All rate limit values (limit and ttl) SHALL be defined in a single exported `THROTTLE_TIERS` constant in `packages/shared`. Controllers SHALL NOT hardcode limit or ttl values.

#### Scenario: Tier values are importable from shared package
- **WHEN** a developer imports `THROTTLE_TIERS` from `@repo/shared`
- **THEN** it exposes at minimum `default` and `strict` keys, each with `limit` and `ttl` properties

### Requirement: Opt-in rate limiting via single decorator
Controllers SHALL opt into rate limiting by applying a single `@RateLimit(tier)` decorator, where `tier` is a key of `THROTTLE_TIERS`. No additional decorators or guard references SHALL be required on the controller.

#### Scenario: Controller with @RateLimit is throttled
- **WHEN** a controller or handler is annotated with `@RateLimit('default')`
- **THEN** requests to that controller are subject to the `default` tier limits

#### Scenario: Controller without @RateLimit is not throttled
- **WHEN** a controller has no `@RateLimit` decorator
- **THEN** requests to that controller are not subject to any throttle check

### Requirement: Authenticated requests are throttled per user identity
For requests that have been authenticated (i.e., `request.user.id` is populated by `MicroserviceAuthGuard`), the throttle bucket key SHALL be derived from the user's ID, not the client IP address.

#### Scenario: Two users from the same IP have independent buckets
- **WHEN** two authenticated users from the same IP address each send requests to a throttled endpoint
- **THEN** each user's request count is tracked independently and neither exhausts the other's quota

#### Scenario: Same user from different IPs shares one bucket
- **WHEN** an authenticated user sends requests from two different IP addresses
- **THEN** both request sequences consume from the same user-scoped bucket

### Requirement: Unauthenticated requests fall back to IP-based throttling
For requests where `request.user` is not set, the throttle bucket key SHALL be derived from the client IP address resolved from `req.ip` (which respects the `trust proxy` setting).

#### Scenario: Unauthenticated request uses IP as key
- **WHEN** a request reaches a throttled endpoint without an authenticated user
- **THEN** the rate limit is enforced per client IP

### Requirement: Throttle bucket is global across all throttled endpoints
The throttle key SHALL NOT include any route, controller, or handler component. A user's request quota is shared across all endpoints protected by `@RateLimit` with the same tier.

#### Scenario: Requests to different endpoints share one bucket
- **WHEN** an authenticated user sends requests to two different controllers both annotated with `@RateLimit('default')`
- **THEN** all requests consume from a single `default` bucket for that user

### Requirement: Throttle state is shared across app instances when Redis is configured
When `throttlerRedisUrl` is provided to `SharedModule.register()`, throttle counters SHALL be stored in Redis and shared across all running instances of the application.

#### Scenario: Redis URL provided — counters persist across instances
- **WHEN** `throttlerRedisUrl` is set in `SharedModule.register()`
- **THEN** a request on instance A increments the same counter that instance B reads

#### Scenario: No Redis URL — in-memory fallback
- **WHEN** `throttlerRedisUrl` is not provided to `SharedModule.register()`
- **THEN** throttle counters are stored in-memory (local to each instance)

### Requirement: Proxy trust is configurable in BootstrapUtil
`BootstrapUtil.setup()` SHALL accept an optional `trustProxy` boolean. When `true`, it SHALL configure the underlying Express instance to trust the `X-Forwarded-For` header (equivalent to `app.set('trust proxy', 1)`).

#### Scenario: trustProxy enabled resolves client IP from X-Forwarded-For
- **WHEN** `trustProxy: true` is passed to `BootstrapUtil.setup()` and a request arrives with an `X-Forwarded-For` header
- **THEN** `req.ip` returns the original client IP, not the proxy's IP

#### Scenario: trustProxy disabled or omitted — direct IP used
- **WHEN** `trustProxy` is not set or is `false`
- **THEN** `req.ip` returns the directly-connected remote address
