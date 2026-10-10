import { Request } from 'express';
import { randomUUID } from 'node:crypto';

const BETTER_AUTH_SESSION_COOKIE_KEYS = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];
export class ContextUtil {
  /** The per-request id threaded through CLS, logs and audit events. */
  static newCorrelationId(): string {
    return `${Date.now()}-${randomUUID()}`;
  }

  static extractToken(req: Request) {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookies = req.cookies as Record<string, string | undefined>;
    for (const key of BETTER_AUTH_SESSION_COOKIE_KEYS) {
      if (cookies?.[key]) {
        return cookies[key];
      }
    }
    return null;
  }
}
