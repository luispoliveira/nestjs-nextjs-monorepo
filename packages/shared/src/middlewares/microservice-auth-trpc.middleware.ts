import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc-v2';
import { firstValueFrom } from 'rxjs';
import { MESSAGE_PATTERNS, SERVICES } from '../constants';
import { ContextUtil } from '../utils';

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
      throw new Error('Unauthorized');
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
      throw new Error('Unauthorized');
    }
  }
}
