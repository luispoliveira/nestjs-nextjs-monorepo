import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { BootstrapUtil, EnvironmentEnum, LoggerUtil } from '@repo/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3200;
  const environment = configService.get<EnvironmentEnum>(
    'NODE_ENV',
    EnvironmentEnum.DEVELOPMENT,
  );

  BootstrapUtil.setup(app, {
    globalPrefix: 'api/worker',
    useHelmet: true,
    enableVersioning: true,
    swagger:
      environment !== EnvironmentEnum.PRODUCTION
        ? {
            title: 'Worker API',
            description: 'API for managing worker tasks',
            version: '1.0.0',
            tag: 'worker',
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
  Logger.log(`Worker application is running on port ${port}`);
}
bootstrap();
