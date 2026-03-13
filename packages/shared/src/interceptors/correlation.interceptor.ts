import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { CLS_CORRELATION_ID } from '../constants';

interface RpcPayload {
  correlationId?: unknown;
}

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorrelationInterceptor.name);

  constructor(private readonly clsService: ClsService) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const contextType = context.getType();

    // Only extract correlationId from RPC payloads (Redis microservice / Bull workers).
    // HTTP requests already have correlationId set by the CLS middleware setup hook.
    if (contextType !== 'http') {
      const payload = context.switchToRpc().getData<RpcPayload>();
      const correlationId = payload?.correlationId;

      if (typeof correlationId === 'string') {
        this.clsService.set(CLS_CORRELATION_ID, correlationId);
      }
    }

    return next.handle();
  }
}
