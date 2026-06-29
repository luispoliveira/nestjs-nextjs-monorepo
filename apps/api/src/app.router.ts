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
  hello(@Ctx() context: shared.AppContextInterface): string {
    console.log('🚀 ~ AppRouter ~ hello ~ context:', context.user);
    const user = context.user as { name?: string } | null | undefined;
    return `Hello, ${user?.name ?? 'worldsa'}!`;
  }
}
