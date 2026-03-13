import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { catchError, map, Observable, throwError } from 'rxjs';
import { MESSAGE_PATTERNS, SERVICES } from '../constants';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class MicroserviceAuthGuard implements CanActivate {
  private readonly logger = new Logger(MicroserviceAuthGuard.name);

  constructor(
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    return this.authClient
      .send<Record<string, unknown>>(MESSAGE_PATTERNS.AUTH_AUTHENTICATE, {
        token,
      })
      .pipe(
        map((user) => {
          (request as unknown as Record<string, unknown>).user = user;
          return true;
        }),
        catchError((err) => {
          this.logger.error('Authentication failed', err);
          return throwError(
            () => new UnauthorizedException('Invalid or expired session'),
          );
        }),
      );
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookies = request.cookies as Record<string, string | undefined>;
    return cookies?.['better-auth.session_token'] ?? null;
  }
}
