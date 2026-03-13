import { ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';
import { SERVICES } from '../constants';

export class MicroserviceUtil {
  static registerAuthService(): ClientsProviderAsyncOptions {
    return {
      name: SERVICES.AUTH,
      useFactory: (configService: ConfigService) => ({
        name: SERVICES.AUTH,
        transport: Transport.REDIS,
        options: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          retryAttempts: 5,
          retryDelay: 3000,
        },
      }),
      inject: [ConfigService],
    };
  }

  static registerNotificationsService(): ClientsProviderAsyncOptions {
    return {
      name: SERVICES.NOTIFICATIONS,
      useFactory: (configService: ConfigService) => ({
        name: SERVICES.NOTIFICATIONS,
        transport: Transport.REDIS,
        options: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          retryAttempts: 5,
          retryDelay: 3000,
        },
      }),
      inject: [ConfigService],
    };
  }
}
