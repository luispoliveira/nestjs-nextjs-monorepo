import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ContextUtil,
  MESSAGE_PATTERNS,
  SERVICES,
} from '@repo/shared';
import { RoleEnum } from '@repo/shared-types';
import { NextFunction, Request, Response } from 'express';
import { catchError, EMPTY, map } from 'rxjs';

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const token = ContextUtil.extractToken(req);

    if (!token) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    this.authClient
      .send<{ role: string }>(MESSAGE_PATTERNS.AUTH_AUTHENTICATE, { token })
      .pipe(
        map((user) => {
          if (user?.role !== RoleEnum.ADMIN) {
            throw new UnauthorizedException('Admin access required');
          }
          return true;
        }),
        catchError(() => {
          res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
          return EMPTY;
        }),
      )
      .subscribe({ next: () => next() });
  }
}
