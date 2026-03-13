import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@repo/database';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { randomUUID } from 'node:crypto';
import z from 'zod';
import { CLS_CORRELATION_ID } from '../constants';
import { AllExceptionFilter } from '../filters';
import { HealthController } from '../health/health.controller';
import { CorrelationInterceptor, LoggingInterceptor } from '../interceptors';
import { pinoConfig } from '../logging';
import { MongoModule } from '../mongo/mongo.module';

const sharedModuleRegisterParamsSchema = z.object({
  throttlerOptions: z
    .object({
      ttl: z.number(),
      limit: z.number(),
    })
    .optional(),
});

type SharedModuleRegisterParams = z.infer<
  typeof sharedModuleRegisterParamsSchema
>;

const defaultParams: SharedModuleRegisterParams = {
  throttlerOptions: {
    ttl: 60000,
    limit: 10,
  },
};

@Module({})
export class SharedModule {
  static register(params = defaultParams): DynamicModule {
    return {
      global: true,
      module: SharedModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
        TerminusModule.forRoot({
          errorLogStyle: 'pretty',
        }),
        MongoModule,
        LoggerModule.forRoot(pinoConfig),
        ThrottlerModule.forRoot([
          params.throttlerOptions || defaultParams.throttlerOptions!,
        ]),
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            setup(cls, req: Request, res: Response) {
              const correlationId = randomUUID();
              cls.set(CLS_CORRELATION_ID, correlationId);
              (req as unknown as Record<string, unknown>)[CLS_CORRELATION_ID] =
                correlationId;
            },
          },
          interceptor: {
            mount: true,
          },
        }),
      ],
      providers: [
        {
          provide: APP_FILTER,
          useClass: AllExceptionFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: LoggingInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: CorrelationInterceptor,
        },
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ZodSerializerInterceptor,
        },
      ],
      controllers: [HealthController],
      exports: [],
    };
  }
}
