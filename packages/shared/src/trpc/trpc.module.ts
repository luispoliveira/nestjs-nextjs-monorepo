import { DynamicModule, Module } from '@nestjs/common';
import { TRPCModule as BaseModule } from 'nestjs-trpc-v2';
import { MongoModule } from '../mongo';
import { AppContext } from './app.context';
import { LoggingTrpcMiddleware } from './middlewares';

@Module({})
export class TrpcModule {
  static register(filePath: string, basePath: string): DynamicModule {
    return {
      global: true,
      imports: [
        MongoModule,
        BaseModule.forRoot({
          autoSchemaFile:
            process.env.NODE_ENV !== 'production' ? filePath : undefined,
          basePath: basePath,
          context: AppContext,
        }),
      ],
      providers: [AppContext, LoggingTrpcMiddleware],
      exports: [],
      module: TrpcModule,
    };
  }
}
