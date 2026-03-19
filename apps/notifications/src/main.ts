import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { BootstrapUtil, LoggerUtil } from '@repo/shared';
import { EnvironmentEnum } from '@repo/shared-types';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3100;
  const environment = configService.get<EnvironmentEnum>(
    'NODE_ENV',
    EnvironmentEnum.DEVELOPMENT,
  );
  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      host: configService.getOrThrow<string>('REDIS_HOST'),
      port: configService.getOrThrow<number>('REDIS_PORT'),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
      retryAttempts: 5,
      retryDelay: 3000,
    },
  });

  BootstrapUtil.setup(app, {
    globalPrefix: 'api/notifications',
    useHelmet: true,
    enableVersioning: true,
    swagger:
      environment !== EnvironmentEnum.PRODUCTION
        ? {
            title: 'Notifications API',
            description: 'API for managing notifications',
            version: '1.0.0',
            tag: 'notifications',
            path: 'docs',
          }
        : undefined,
    cors: {
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      credentials: true,
    },
    enableCookieParser: true,
  });

  app.useLogger(LoggerUtil.getAppLogger(environment));
  app.enableShutdownHooks();
  await app.startAllMicroservices();

  await app.listen(port);
  Logger.log(`Notifications application is running on port ${port}`);
}
bootstrap();
