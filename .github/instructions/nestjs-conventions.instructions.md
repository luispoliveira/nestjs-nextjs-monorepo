---
description: 'Use when creating or modifying NestJS apps or shared packages. Covers module setup, microservices, validation, guards, publishers, consumers, and queue patterns for this monorepo.'
applyTo: 'apps/{auth-api,notifications,worker}/**/*.ts,packages/{shared,mail,database}/**/*.ts'
---

# NestJS Conventions

## Module Bootstrap

Every NestJS app module MUST import `SharedModule.register()` first. It globally provides:

- `ConfigModule` (env vars)
- `DatabaseModule` (Prisma)
- `LoggerModule` (nestjs-pino)
- `ThrottlerModule` (rate limiting)
- `ClsModule` (correlation IDs)
- `AllExceptionFilter`
- `ZodValidationPipe`
- `ZodSerializerInterceptor`
- `CorrelationInterceptor`

```typescript
@Module({
  imports: [
    SharedModule.register(),
    // ... other imports
  ],
})
export class AppModule {}
```

## Validation

- Use **Zod** schemas for all DTOs. Prefer schemas from `@repo/shared-types` if shared with frontend.
- Use `nestjs-zod` decorators: `@ZodSerializerDto(MyZodSchema)` on controllers.
- `ZodValidationPipe` and `ZodSerializerInterceptor` are registered globally by `SharedModule`.

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
```

## Microservices (Redis Transport)

- Service injection tokens come from `SERVICES` constant in `@repo/shared`.
- Register client microservices using `MicroserviceUtil` helpers from `@repo/shared`.
- Emit events with `EventPatterns`, request/response with `MessagePatterns`.
- Never hardcode service names or patterns as raw strings.

```typescript
import { SERVICES, EVENT_PATTERNS, MicroserviceUtil } from '@repo/shared';

// In module imports:
ClientsModule.registerAsync([MicroserviceUtil.registerNotificationsService()]);

// Emitting events — use a Publisher class, not raw client:
this.notificationsPublisher.emitUserCreated({ userId, email });
```

## Publishers

To emit microservice events, extend `BasePublisher` from `@repo/shared/abstracts`:

```typescript
@Injectable()
export class MyPublisher extends BasePublisher {
  constructor(
    @Inject(SERVICES.MY_SERVICE) client: ClientProxy,
    protected clsService: ClsService,
  ) {
    super(client, clsService);
  }

  emitSomethingHappened(data: SomethingHappenedInput) {
    this.publish<SomethingHappenedInput>(
      EVENT_PATTERNS.SOMETHING_HAPPENED,
      data,
    );
  }
}
```

## Queue (BullMQ/Bull)

- Register queues with `QueueModule.registerQueues([QUEUES.EMAIL])` — always use queue names from `QUEUES` constant.
- Job producers extend `BaseProducer` from `@repo/shared/abstracts`.
- Workers/consumers decorate methods with `@Process(JOBS.MY_JOB)`.

```typescript
// Registering:
QueueModule.registerQueues([QUEUES.EMAIL]);

// Producer:
export class EmailProducer extends BaseProducer {
  async queueSendEmail(data: SendEmailInput) {
    await this.addJob(QUEUES.EMAIL, JOBS.SEND_EMAIL, data);
  }
}
```

## Error Handling

`AllExceptionFilter` is registered globally. In services:

```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', { error });
  throw new InternalServerErrorException('User-friendly message');
}
```

## Authentication

- Auth is handled entirely by `better-auth` via `@thallesp/nestjs-better-auth`.
- Use `@Public()` decorator (from shared) to bypass global `AuthGuard`.
- Do NOT implement custom JWT strategies or Passport guards.

## Configuration

Always use `ConfigService` — never access `process.env` directly in application code (exception: `main.ts` bootstrap).

```typescript
// ✓ correct
const apiKey = configService.getOrThrow<string>('API_KEY');

// ✗ avoid
const apiKey = process.env.API_KEY;
```

## Logging

Inject `Logger` from `@nestjs/common` or use `PinoLogger` from `nestjs-pino`:

```typescript
private readonly logger = new Logger(MyService.name);
```

Correlation IDs are automatically propagated via `ClsService`.
