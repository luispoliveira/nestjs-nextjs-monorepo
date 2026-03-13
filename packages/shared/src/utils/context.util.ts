import { Request } from 'express';

const BETTER_AUTH_SESSION_COOKIE = 'better-auth.session_token';

export class ContextUtil {
  static extractToken(req: Request) {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookies = req.cookies as Record<string, string | undefined>;
    return cookies?.[BETTER_AUTH_SESSION_COOKIE] ?? null;
  }
}
