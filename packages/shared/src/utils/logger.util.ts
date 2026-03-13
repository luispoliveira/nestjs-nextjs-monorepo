import { LogLevel } from '@nestjs/common';
import { EnvironmentEnum } from '@repo/shared-types';

export class LoggerUtil {
  static getAppLogger(environment: EnvironmentEnum): LogLevel[] {
    const logger: LogLevel[] = ['error', 'warn'];

    switch (environment) {
      case EnvironmentEnum.DEVELOPMENT:
        logger.push('log', 'debug', 'verbose');
        break;
      case EnvironmentEnum.PRODUCTION:
        break;
      default:
        break;
    }

    return logger;
  }
}
