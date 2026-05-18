import { Request } from 'express';

const BETTER_AUTH_SESSION_COOKIE_KEYS = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];
export class ContextUtil {
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
