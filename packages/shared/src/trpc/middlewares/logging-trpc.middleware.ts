import { Injectable, Logger } from '@nestjs/common';
import {
  CLS_CORRELATION_ID,
  Log,
  MongoService,
  SanitizeUtil,
} from '@repo/shared';
import { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc-v2';

type TrpcContext = {
  req: Request;
  res: unknown;
  user?: Record<string, unknown>;
};

@Injectable()
export class LoggingTrpcMiddleware implements TRPCMiddleware {
  private readonly logger = new Logger(LoggingTrpcMiddleware.name);

  constructor(
    private readonly mongoService: MongoService,
    private readonly clsService: ClsService,
  ) {}

  async use(opts: MiddlewareOptions<TrpcContext>): Promise<MiddlewareResponse> {
    const { ctx, next, path, type, input } = opts;

    const now = Date.now();
    const { headers, ip } = ctx.req;
    const correlationId = this.clsService.get<string>(CLS_CORRELATION_ID);
    const user = ctx.user;

    const logData: Partial<Log> = {
      method: type.toUpperCase(),
      url: `/trpc/${path}`,
      ip,
      correlationId,
      user: user
        ? (SanitizeUtil.sanitize(user) as Record<string, unknown>)
        : undefined,
      headers: SanitizeUtil.sanitize(headers as Record<string, unknown>),
      requestBody:
        input && typeof input === 'object'
          ? (SanitizeUtil.sanitize(input as object) as Record<string, unknown>)
          : undefined,
    };

    const log = await this.mongoService.createLog(logData).catch((error) => {
      this.logger.error('Failed to save tRPC log:', error);
    });

    try {
      const result = await next();
      const duration = Date.now() - now;

      if (log) {
        this.mongoService
          .updateLog(log._id as unknown as string, {
            statusCode: 200,
            duration,
            responseBody:
              result && typeof result === 'object'
                ? (SanitizeUtil.sanitize(result as object) as Record<
                    string,
                    unknown
                  >)
                : undefined,
          })
          .catch((logError) => {
            this.logger.error('Failed to update tRPC log:', logError);
          });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - now;
      const trpcError = error as {
        code?: string;
        httpStatus?: number;
        message?: string;
      };

      if (log) {
        this.mongoService
          .updateLog(log._id as unknown as string, {
            statusCode: trpcError.httpStatus ?? 500,
            duration,
            responseBody: {
              code: trpcError.code,
              message: trpcError.message,
            } as unknown as Record<string, unknown>,
          })
          .catch((logError) => {
            this.logger.error('Failed to update tRPC error log:', logError);
          });
      }

      throw error;
    }
  }
}
