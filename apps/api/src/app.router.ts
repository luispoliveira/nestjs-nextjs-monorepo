import * as shared from '@repo/shared';
import { LoggingTrpcMiddleware } from '@repo/shared';
import { Ctx, Query, Router, UseMiddlewares } from 'nestjs-trpc-v2';
import z from 'zod';

@Router()
@UseMiddlewares(LoggingTrpcMiddleware, shared.AuthTrpcMiddleware)
export class AppRouter {
  constructor() {}

  @Query({
    output: z.string(),
  })
  async hello(@Ctx() context: shared.AppContextInterface) {
    console.log('🚀 ~ AppRouter ~ hello ~ context:', context.user);

    return `Hello, ${context.user || 'worldsa'}!`;
  }
}
