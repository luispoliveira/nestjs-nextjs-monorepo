import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ContextUtil, MESSAGE_PATTERNS, SERVICES } from '@repo/shared';
import { TRPCError } from '@trpc/server';
import { Request } from 'express';
import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc-v2';
import { firstValueFrom } from 'rxjs';

type TrpcContext = {
  req: Request;
  res: unknown;
};

@Injectable()
export class AuthTrpcMiddleware implements TRPCMiddleware {
  private readonly logger = new Logger(AuthTrpcMiddleware.name);

  constructor(
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
  ) {}

  async use(opts: MiddlewareOptions<TrpcContext>): Promise<MiddlewareResponse> {
    const { ctx, next } = opts;

    const token = ContextUtil.extractToken(ctx.req);

    if (!token) {
      this.logger.warn('No authentication token provided in tRPC request');
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      });
    }

    try {
      const user = await firstValueFrom(
        this.authClient.send<Record<string, unknown>>(
          MESSAGE_PATTERNS.AUTH_AUTHENTICATE,
          { token },
        ),
      );

      return next({ ctx: { ...ctx, user } });
    } catch (error) {
      this.logger.error('tRPC authentication failed', error);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      });
    }
  }
}
