import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAFE_CHANGE_FIELDS } from '@repo/shared-types';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../constants/cls';
import { MongoService } from '../mongo/mongo.service';
import { AuditEventFields } from '../mongo/schema/audit-event.schema';
import { SentryUtil } from '../utils/sentry.util';

const DEFAULT_RETENTION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What a caller supplies; the service adds the timestamps and the retention. */
export type AuditInput = Omit<AuditEventFields, 'occurredAt' | 'expireAt'>;

/**
 * Records audit events, best-effort: a storage failure is logged and sent to
 * Sentry but never thrown, so the audited action keeps exactly the result it
 * would have had (audit-log spec). `changes` is filtered down to the
 * non-sensitive fields; every other value is dropped here, in one place.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly mongo: MongoService,
    private readonly config: ConfigService,
    private readonly cls: ClsService,
  ) {}

  async record(input: AuditInput): Promise<void> {
    let correlationId = input.correlationId;
    try {
      const occurredAt = new Date();
      const expireAt = new Date(
        occurredAt.getTime() + this.retentionDays() * DAY_MS,
      );
      correlationId ??= this.currentCorrelationId();

      const { changes, ...rest } = input;
      const safeChanges = this.pickSafeChanges(changes);
      await this.mongo.createAuditEvent({
        ...rest,
        correlationId,
        occurredAt,
        expireAt,
        ...(safeChanges ? { changes: safeChanges } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit event ${input.action} (correlationId=${correlationId ?? '-'})`,
        error instanceof Error ? error.stack : String(error),
      );
      SentryUtil.captureException(error, {
        extra: { action: input.action, correlationId },
        tags: { component: 'audit' },
      });
    }
  }

  private retentionDays(): number {
    const days = Number(this.config.get('AUDIT_RETENTION_DAYS'));
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
  }

  private currentCorrelationId(): string | undefined {
    try {
      return this.cls.get<string>(CLS_CORRELATION_ID);
    } catch {
      return undefined; // outside a CLS context (e.g. a better-auth hook)
    }
  }

  private pickSafeChanges(
    changes: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!changes) return undefined;
    const safe: Record<string, unknown> = {};
    for (const field of SAFE_CHANGE_FIELDS) {
      if (field in changes) safe[field] = changes[field];
    }
    return Object.keys(safe).length > 0 ? safe : undefined;
  }
}
