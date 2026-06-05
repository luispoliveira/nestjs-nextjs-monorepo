import { DynamicModule, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';

export interface MetricsModuleOptions {
  appName?: string;
}

@Module({})
export class MetricsModule {
  static register(options: MetricsModuleOptions = {}): DynamicModule {
    const defaultLabels: Record<string, string> = options.appName
      ? { app: options.appName }
      : {};

    return {
      module: MetricsModule,
      imports: [
        PrometheusModule.register({
          controller: MetricsController,
          defaultMetrics: { enabled: true },
          defaultLabels,
        }),
      ],
      exports: [],
    };
  }
}
