import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc-v2';

@Injectable()
export class AuthTrpcMiddleware implements TRPCMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(
    opts: MiddlewareOptions<{ req: any; res: any }>,
  ): Promise<MiddlewareResponse> {
    const { ctx, next } = opts;

    try {
      const session = await this.authService.api.getSession({
        headers: ctx.req.headers,
      });

      if (session?.user && session.session) {
        return next({
          ctx: {
            ...ctx,
            user: session.user,
          },
        });
      }

      throw new Error('Unauthorized');
    } catch (error) {
      throw new Error('Unauthorized');
    }
  }
}
