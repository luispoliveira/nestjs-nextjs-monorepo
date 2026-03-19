import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import z, { parse } from 'zod';

const LogLevelEnum = z.enum([
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
  'fatal',
]);

const bootstrapUtilConfigSchema = z.object({
  globalPrefix: z.string(),
  logger: z.array(LogLevelEnum).optional(),
  useHelmet: z.boolean(),
  enableVersioning: z.boolean(),
  swagger: z
    .object({
      title: z.string(),
      description: z.string(),
      version: z.string(),
      tag: z.string(),
      path: z.string(),
    })
    .optional(),
  enableCookieParser: z.boolean(),
  cors: z.object({
    origin: z.union([z.string().min(1), z.array(z.string().min(1))]),
    credentials: z.boolean(),
  }),
});

type BootstrapUtilConfig = z.infer<typeof bootstrapUtilConfigSchema>;

export class BootstrapUtil {
  static setup(app: INestApplication, config: BootstrapUtilConfig) {
    const validated = parse(bootstrapUtilConfigSchema, config);

    this.setGlobalPrefix(app, validated);
    this.setLogger(app, validated.logger);
    this.enableHelmet(app, validated);
    this.enableVersioning(app, validated);
    this.setupSwagger(app, validated.swagger);
    this.enableCookieParser(app, validated);
    this.enableCors(app, validated);
  }

  private static setGlobalPrefix(
    app: INestApplication,
    config: BootstrapUtilConfig,
  ) {
    app.setGlobalPrefix(config.globalPrefix);
  }

  private static setLogger(
    app: INestApplication,
    logger?: BootstrapUtilConfig['logger'],
  ) {
    if (!logger) return;

    app.useLogger(logger);
  }

  private static enableHelmet(
    app: INestApplication,
    config: BootstrapUtilConfig,
  ) {
    if (!config.useHelmet) return;

    app.use(helmet());
  }

  private static enableVersioning(
    app: INestApplication,
    config: BootstrapUtilConfig,
  ) {
    if (!config.enableVersioning) return;

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
  }

  private static setupSwagger(
    app: INestApplication,
    swaggerConfig: BootstrapUtilConfig['swagger'],
  ) {
    if (!swaggerConfig) return;

    const config = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addTag(swaggerConfig.tag)
      .addBearerAuth()
      .addCookieAuth('connect.sid')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerConfig.path, app, cleanupOpenApiDoc(document), {
      useGlobalPrefix: true,
      jsonDocumentUrl: `${swaggerConfig.path}-json`,
    });
  }

  private static enableCookieParser(
    app: INestApplication,
    config: BootstrapUtilConfig,
  ) {
    if (!config.enableCookieParser) return;

    app.use(cookieParser());
  }

  private static enableCors(
    app: INestApplication,
    config: BootstrapUtilConfig,
  ) {
    app.enableCors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    });
  }
}
