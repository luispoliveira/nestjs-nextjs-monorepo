import * as Brevo from '@getbrevo/brevo';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Mail, MailModuleOptions } from '../interfaces/mail.interface';
import { MailProvider } from '../interfaces/provider.interface';

@Injectable()
export class BrevoProvider implements MailProvider {
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly apiInstance: Brevo.TransactionalEmailsApi;

  constructor(
    @Inject('MAIL_MODULE_OPTIONS')
    private readonly options: MailModuleOptions,
  ) {
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      this.options.apiKey,
    );
  }

  async send(mail: Mail): Promise<void> {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: this.options.fromEmail,
      name: this.options.fromName,
    };
    sendSmtpEmail.to = mail.to;
    sendSmtpEmail.subject = mail.subject;
    sendSmtpEmail.textContent = mail.text;

    if (mail.cc) sendSmtpEmail.cc = mail.cc;

    if (mail.bcc) sendSmtpEmail.bcc = mail.bcc;

    if (mail.templateId) sendSmtpEmail.templateId = Number(mail.templateId);
    if (mail.data) sendSmtpEmail.params = mail.data;

    if (mail.attachments)
      sendSmtpEmail.attachment = mail.attachments.map((att) => ({
        name: att.filename,
        content: att.content.toString('base64'),
      }));

    try {
      this.logger.log(
        `Sending email to ${mail.to.map((r) => r.email).join(', ')}`,
      );
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log('Email sent successfully.');
    } catch (error) {
      this.logger.error('Failed to send email with Brevo', error);
      // The error will be caught by the MailService's retry logic
      throw error;
    }
  }
}
