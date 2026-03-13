import {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common';

export interface MailRecipient {
  name?: string;
  email: string;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface Mail {
  to: MailRecipient[];
  cc?: MailRecipient[];
  bcc?: MailRecipient[];
  subject?: string;
  text?: string;
  templateId?: string;
  data?: Record<string, unknown>;
  attachments?: MailAttachment[];
}

export interface MailModuleOptions {
  provider: 'brevo' | 'sendgrid';
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  devEmail?: string;
}

export interface MailOptionsFactory {
  createMailOptions():
    | Promise<Omit<MailModuleOptions, 'provider'>>
    | Omit<MailModuleOptions, 'provider'>;
}

export interface MailModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  provider: 'brevo' | 'sendgrid';
  useExisting?: Type<MailOptionsFactory>;
  useClass?: Type<MailOptionsFactory>;
  useFactory?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) =>
    | Promise<Omit<MailModuleOptions, 'provider'>>
    | Omit<MailModuleOptions, 'provider'>;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}
