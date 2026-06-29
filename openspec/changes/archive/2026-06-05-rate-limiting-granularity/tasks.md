## 1. Dependencies

- [x] 1.1 Add `@nest-lab/throttler-storage-redis` to `packages/shared/package.json`
- [x] 1.2 Run `pnpm install` to update lockfile

## 2. Shared Constants

- [x] 2.1 Create `packages/shared/src/constants/throttler.ts` — export `THROTTLE_TIERS` with `default` and `strict` tiers
- [x] 2.2 Export `THROTTLE_TIERS` from `packages/shared/src/constants/index.ts`

## 3. Custom Throttler Guard

- [x] 3.1 Create `packages/shared/src/guards/custom-throttler.guard.ts` extending `ThrottlerGuard`
- [x] 3.2 Override `getTracker(req)` — return `"user:{id}"` when `request.user?.id` exists, fall back to `req.ip`
- [x] 3.3 Override `generateKey(ctx, tracker, name)` — return `sha256("{name}-{tracker}")` with no route component
- [x] 3.4 Export `CustomThrottlerGuard` from `packages/shared/src/guards/index.ts`

## 4. @RateLimit Composite Decorator

- [x] 4.1 Create `packages/shared/src/decorators/rate-limit.decorator.ts` — `@RateLimit(tier)` applies `@UseGuards(CustomThrottlerGuard)` and `@Throttle({ default: THROTTLE_TIERS[tier] })`
- [x] 4.2 Export `RateLimit` from `packages/shared/src/decorators/index.ts`

## 5. SharedModule — Optional Redis Storage

- [x] 5.1 Add `throttlerRedisUrl?: string` to `sharedModuleRegisterParamsSchema` in `packages/shared/src/modules/shared.module.ts`
- [x] 5.2 Replace `ThrottlerModule.forRoot()` with `ThrottlerModule.forRootAsync()` using `useFactory` — conditionally inject `ThrottlerStorageRedisService` when `throttlerRedisUrl` is provided
- [x] 5.3 Update `SharedModule` imports to include `ThrottlerStorageRedisService` provider when Redis URL is present

## 6. BootstrapUtil — trustProxy

- [x] 6.1 Add `trustProxy?: boolean` to `bootstrapUtilConfigSchema` in `packages/shared/src/utils/bootstrap.util.ts`
- [x] 6.2 In `BootstrapUtil.setup()`, when `trustProxy` is `true`, call `app.getHttpAdapter().getInstance().set('trust proxy', 1)`

## 7. apps/api Wiring

- [x] 7.1 Pass `throttlerRedisUrl: process.env.REDIS_URL` to `SharedModule.register()` in `apps/api/src/app.module.ts`
- [x] 7.2 Pass `trustProxy: true` to `BootstrapUtil.setup()` in `apps/api/src/main.ts`

## 8. Apply to API Controllers

- [x] 8.1 Add `@RateLimit('default')` to `AppController` (only controller in `apps/api`)
- [x] 8.2 Verify no existing controllers unexpectedly break (check all files in `apps/api/src/`)

## 9. Verification

- [x] 9.1 Run `pnpm build` — confirm no type errors
- [x] 9.2 Run `pnpm lint` — pre-existing ESLint config conflict unrelated to this change; no new errors
- [ ] 9.3 Manually test: send > 60 requests/min as an authenticated user and confirm 429 response
- [ ] 9.4 Confirm unauthenticated requests to a throttled route are rate-limited by IP
