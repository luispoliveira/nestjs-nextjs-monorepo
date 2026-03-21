import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule } from '@nestjs/microservices';
import {
  AuthTrpcMiddleware,
  LoggingTrpcMiddleware,
  MicroserviceAuthGuard,
  MicroserviceUtil,
  SharedModule,
} from '@repo/shared';
import { TRPCModule } from 'nestjs-trpc-v2';
import * as path from 'path';
import { AppContext } from './app.context';
import { AppController } from './app.controller';
import { AppRouter } from './app.router';

@Module({
  imports: [
    SharedModule.register(),
    ClientsModule.registerAsync([MicroserviceUtil.registerAuthService()]),
    TRPCModule.forRoot({
      autoSchemaFile:
        process.env.NODE_ENV !== 'production'
          ? path.resolve(__dirname, '../../../packages/trpc/src/server/api')
          : undefined,
      basePath: '/api/trpc',
      context: AppContext,
    }),
  ],
  controllers: [AppController],
  providers: [
    AuthTrpcMiddleware,
    LoggingTrpcMiddleware,
    {
      provide: APP_GUARD,
      useClass: MicroserviceAuthGuard,
    },
    AppContext,
    AppRouter,
  ],
})
export class AppModule {}
