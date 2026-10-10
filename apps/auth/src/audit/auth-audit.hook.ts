import { Injectable, Logger } from '@nestjs/common';
import { AuditService, SentryUtil } from '@repo/shared';
import * as nestjsBetterAuth from '@thallesp/nestjs-better-auth';
import { buildAuthEvent } from './auth-audit';

/**
 * One after hook for every better-auth endpoint (a pathless `@AfterHook()`
 * runs for all of them, failures included — better-auth sets
 * `ctx.context.returned` to the APIError before running after hooks).
 * `AUTH_AUDIT_PATHS` decides what is audited.
 *
 * This hook must never throw: an APIError thrown from an after hook replaces
 * the real response, so a bug here could turn a successful sign-in into an error.
 */
@nestjsBetterAuth.Hook()
@Injectable()
export class AuthAuditHook {
  private readonly logger = new Logger(AuthAuditHook.name);

  constructor(
    private readonly audit: AuditService,
    private readonly authService: nestjsBetterAuth.AuthService,
  ) {}

  /**
   * better-auth clears the session during `/sign-out`, so the after hook can
   * no longer tell who signed out. Look the session up first and stash it on
   * the (shared) hook context for `buildAuthEvent`.
   */
  @nestjsBetterAuth.BeforeHook('/sign-out')
  async rememberSignOutSession(
    ctx: nestjsBetterAuth.AuthHookContext,
  ): Promise<void> {
    try {
      const found = await this.authService.api.getSession({
        headers: ctx.headers as Headers,
      });
      if (found) {
        // `auditSession` is read back by buildAuthEvent (AuthAuditContext).
        (ctx.context as unknown as Record<string, unknown>).auditSession =
          found;
      }
    } catch {
      // Best-effort: a sign-out without a known actor is still audited.
    }
  }

  @nestjsBetterAuth.AfterHook()
  async onAfter(ctx: nestjsBetterAuth.AuthHookContext): Promise<void> {
    try {
      const event = buildAuthEvent(ctx);
      if (event) await this.audit.record(event);
    } catch (error) {
      this.logger.error(
        'Failed to audit an authentication request',
        error instanceof Error ? error.stack : String(error),
      );
      SentryUtil.captureException(error, { tags: { component: 'audit' } });
    }
  }
}
