## 1. Shared base schema

- [ ] 1.1 Create `packages/shared/src/config/base-env.schema.ts` with `baseEnvSchema` covering `NODE_ENV`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` (coerced), `MONGO_URI`, `PORT` (coerced)
- [ ] 1.2 Export `baseEnvSchema` and `BaseEnv` type from `packages/shared/src/index.ts`

## 2. SharedModule — thread validate param

- [ ] 2.1 Add optional `validate?: (config: Record<string, unknown>) => Record<string, unknown>` to `SharedModuleRegisterParams` in `packages/shared/src/modules/shared.module.ts`
- [ ] 2.2 Pass `validate: params.validate` into `ConfigModule.forRoot()` inside `SharedModule.register()`

## 3. Per-app env schemas (NestJS)

- [ ] 3.1 Create `apps/auth/src/env.ts` — `authEnvSchema` extending base with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UI_URL?`, `GOOGLE_CLIENT_ID?`, `GOOGLE_CLIENT_SECRET?`, `CORS_ORIGIN?`
- [ ] 3.2 Create `apps/api/src/env.ts` — `apiEnvSchema` extending base with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `CORS_ORIGIN?`
- [ ] 3.3 Create `apps/notifications/src/env.ts` — `notificationsEnvSchema` extending base with `CORS_ORIGIN?`
- [ ] 3.4 Create `apps/worker/src/env.ts` — `workerEnvSchema` extending base with `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `DEV_EMAIL?`

## 4. Wire validate into each AppModule

- [ ] 4.1 Update `apps/auth/src/app.module.ts` — pass `validate: (c) => authEnvSchema.parse(c)` to `SharedModule.register()`
- [ ] 4.2 Update `apps/api/src/app.module.ts` — pass `validate: (c) => apiEnvSchema.parse(c)` to `SharedModule.register()`
- [ ] 4.3 Update `apps/notifications/src/app.module.ts` — pass `validate: (c) => notificationsEnvSchema.parse(c)` to `SharedModule.register()`
- [ ] 4.4 Update `apps/worker/src/app.module.ts` — pass `validate: (c) => workerEnvSchema.parse(c)` to `SharedModule.register()`

## 5. Fix process.env direct reads in auth app

- [ ] 5.1 In `apps/auth/src/app.module.ts`, replace `process.env.GOOGLE_CLIENT_ID!` and `process.env.GOOGLE_CLIENT_SECRET!` with `configService.get<string>('GOOGLE_CLIENT_ID')` and `configService.get<string>('GOOGLE_CLIENT_SECRET')`
- [ ] 5.2 Make the `socialProviders.google` block conditional — only include it when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty strings

## 6. Next.js env validation

- [ ] 6.1 Create `apps/web/env.ts` — `webEnvSchema` with `AUTH_API_URL`, `NEXT_PUBLIC_AUTH_API_URL`, `BACKEND_PROTOCOL` (enum), `BACKEND_HOST`; export `const env = webEnvSchema.parse(process.env)`
- [ ] 6.2 Update `apps/web/lib/auth/server.ts` (and any other server utility reading `process.env` directly) to import `env` from `../../env`

## 7. Verify

- [ ] 7.1 Run `pnpm build` — confirm all apps build without type errors
- [ ] 7.2 Run `pnpm check-types` — confirm no new type errors
- [ ] 7.3 Manually test fail-fast: rename `DATABASE_URL` in one app's `.env` and confirm the app crashes at boot with a readable error, not a runtime exception
