import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BootstrapUtil, EnvironmentEnum } from '@repo/shared';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);

  const environment = configService.get<EnvironmentEnum>(
    'NODE_ENV',
    EnvironmentEnum.DEVELOPMENT,
  );

  BootstrapUtil.setup(app, {
    globalPrefix: 'api/auth',
    useHelmet: true,
    enableVersioning: true,
    swagger:
      environment !== EnvironmentEnum.PRODUCTION
        ? {
            title: 'Auth API',
            description: 'API for authentication and authorization',
            version: '1.0.0',
            tag: 'auth',
            path: 'docs',
          }
        : undefined,
    cors: {
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      credentials: true,
    },
    enableCookieParser: true,
  });

  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port);
  console.log(`Auth API is running on port ${port}`);
  console.log(`🚀 Auth Service running on: http://localhost:${port}/api/auth`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/auth/docs`);
}
bootstrap().catch((err) => {
  console.error('Error starting Auth API:', err);
  process.exit(1);
});
