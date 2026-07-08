import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Example scheduled job — replace with real ones.
 *
 * ponytail: run this app single-instance (e.g. PM2 `fork` with 1 instance) so
 * jobs don't fire once per replica. Upgrade path: a Redis lock or a BullMQ
 * repeatable job if you ever need HA scheduling across multiple instances.
 */
@Injectable()
export class ExampleCronService {
  private readonly logger = new Logger(ExampleCronService.name);

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'example-heartbeat',
    timeZone: 'Europe/Lisbon',
  })
  handleCron(): void {
    this.logger.log('Example cron tick');
  }
}
