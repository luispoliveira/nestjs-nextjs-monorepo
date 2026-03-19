import { prismaAdapter } from '@better-auth/prisma-adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule } from '@nestjs/microservices';
import { DatabaseModule, DatabaseService } from '@repo/database';
import {
  MicroserviceUtil,
  NotificationsPublisher,
  SharedModule,
} from '@repo/shared';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { AuthController } from './auth.controller';
import { LocalAuthService, publisherProxy } from './local-auth.service';
@Module({
  imports: [
    SharedModule.register(),
    ClientsModule.registerAsync([
      MicroserviceUtil.registerNotificationsService(),
    ]),
    AuthModule.forRootAsync({
      imports: [DatabaseModule, ConfigModule],
      useFactory: (
        database: DatabaseService,
        configService: ConfigService,
      ) => ({
        bodyParser: {
          json: { limit: '10mb' },
          urlencoded: { limit: '10mb', extended: true },
          rawBody: true,
        },
        auth: betterAuth({
          appName: 'Nes(x)tJs Template',
          plugins: [twoFactor(), admin()],
          baseURL:
            configService.get<string>('BETTER_AUTH_URL') ||
            'http://localhost:30000/api/auth',
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            },
          },
          database: prismaAdapter(database, {
            provider: 'postgresql',
          }),
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            sendResetPassword: ({ user, token }): Promise<void> => {
              if (!publisherProxy.instance)
                throw new Error('NotificationsPublisher instance not set');

              const uiUrl =
                configService.get<string>('UI_URL') ?? 'http://localhost:8080';
              const resetUrl = `${uiUrl}/reset-password?token=${token}`;
              const expiresAt = new Date(
                Date.now() + 60 * 60 * 1000,
              ).toISOString();

              publisherProxy.instance.emitUserPasswordResetRequested({
                userId: user.id,
                email: user.email,
                resetToken: resetUrl,
                expiresAt,
              });

              return Promise.resolve();
            },
            onPasswordReset: ({ user }): Promise<void> => {
              if (!publisherProxy.instance)
                throw new Error('NotificationsPublisher instance not set');

              publisherProxy.instance.emitUserPasswordChanged({
                userId: user.id,
                email: user.email,
                reason: 'Password reset requested by user',
              });

              return Promise.resolve();
            },
          },
          emailVerification: {
            sendVerificationEmail: ({ user, token }): Promise<void> => {
              if (!publisherProxy.instance)
                throw new Error('NotificationsPublisher instance not set');

              const uiUrl =
                configService.get<string>('UI_URL') ?? 'http://localhost:8080';

              const verificationUrl = `${uiUrl}/verify-email?token=${token}`;

              publisherProxy.instance.emitUserEmailVerificationRequested({
                userId: user.id,
                email: user.email,
                verificationLink: verificationUrl,
              });

              return Promise.resolve();
            },
          },
          trustedOrigins: configService.get<string>('UI_URL')
            ? [configService.get<string>('UI_URL')!]
            : ['http://localhost:8080', 'http://localhost:8090'],
          hooks: {},
          databaseHooks: {
            user: {
              create: {
                after: (user): Promise<void> => {
                  const adminEmail =
                    configService.getOrThrow<string>('ADMIN_EMAIL');
                  if (user.email === adminEmail) return Promise.resolve();

                  if (!publisherProxy.instance)
                    throw new Error('NotificationsPublisher instance not set');

                  publisherProxy.instance.emitUserCreated({
                    userId: user.id,
                    email: user.email,
                  });

                  return Promise.resolve();
                },
              },
            },
          },
        }),
      }),
      inject: [DatabaseService, ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    NotificationsPublisher,
    LocalAuthService,
  ],
})
export class AppModule {}
