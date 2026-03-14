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
import { LocalAuthService } from './local-auth.service';
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
          },
          trustedOrigins: configService.get<string>('UI_URL')
            ? [configService.get<string>('UI_URL')!]
            : [],
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
    // AuthRouter,
    // AuthTrpcMiddleware,
  ],
})
export class AppModule {}
