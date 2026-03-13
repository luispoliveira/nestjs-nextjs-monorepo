import {
  DynamicModule,
  Module,
  NotImplementedException,
  Provider,
  Type,
} from '@nestjs/common';
import { MongoModule } from '@repo/shared';
import {
  MailModuleAsyncOptions,
  MailModuleOptions,
  MailOptionsFactory,
} from './interfaces/mail.interface';
import { MailProvider } from './interfaces/provider.interface';
import { MailService } from './mail.service';
import { BrevoProvider } from './providers/brevo.provider';

@Module({
  imports: [MongoModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    const mailProvider = this.createMailProvider(options.provider);

    return {
      module: MailModule,
      providers: [
        mailProvider,
        {
          provide: 'MAIL_MODULE_OPTIONS',
          useValue: options,
        },
      ],
    };
  }

  static forRootAsync(options: MailModuleAsyncOptions): DynamicModule {
    const mailProvider = this.createMailProvider(options.provider);
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: MailModule,
      imports: options.imports,
      providers: [...asyncProviders, mailProvider],
    };
  }

  private static createMailProvider(provider: 'brevo' | 'sendgrid'): Provider {
    let providerClass: Type<MailProvider>;

    switch (provider) {
      case 'brevo':
        providerClass = BrevoProvider;
        break;
      case 'sendgrid':
        throw new NotImplementedException(
          'SendGrid provider is not implemented yet.',
        );
      default:
        throw new Error('Invalid mail provider specified.');
    }

    return {
      provide: 'MailProvider',
      useClass: providerClass,
    };
  }

  private static createAsyncProviders(
    options: MailModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<MailOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: MailModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: 'MAIL_MODULE_OPTIONS',
        useFactory: async (...args: unknown[]) => {
          if (!options.useFactory) {
            throw new Error('useFactory is not defined');
          }

          const config = await options.useFactory(...args);
          return { ...config, provider: options.provider };
        },
        inject: options.inject || [],
      };
    }

    const inject = [options.useClass as Type<MailOptionsFactory>];

    return {
      provide: 'MAIL_MODULE_OPTIONS',
      useFactory: async (optionsFactory: MailOptionsFactory) => {
        const config = await optionsFactory.createMailOptions();
        return { ...config, provider: options.provider };
      },
      inject,
    };
  }
}
