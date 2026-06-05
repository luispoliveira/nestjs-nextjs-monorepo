import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = (req as Record<string, unknown> & { user?: { id?: string } })
      .user;
    if (user?.id) return `user:${user.id}`;
    const ip = (req as Record<string, unknown> & { ip?: string }).ip;
    if (!ip) this.logger.warn('Unable to resolve client IP for rate limiting');
    return `ip:${ip ?? 'unknown'}`;
  }

  protected generateKey(
    _context: ExecutionContext,
    tracker: string,
    name: string,
  ): string {
    return createHash('sha256').update(`${name}-${tracker}`).digest('hex');
  }
}
