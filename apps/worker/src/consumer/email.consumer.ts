import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { MailService } from '@repo/mail';
import {
  JOB_PATTERNS,
  QUEUES,
  SendEmailVerificationEmailInput,
  sendEmailVerificationEmailSchema,
  SendPasswordChangedEmailInput,
  sendPasswordChangedEmailInputSchema,
  SendPasswordResetEmailInput,
  sendPasswordResetEmailInputSchema,
  SendTwoFactorDisabledEmailInput,
  SendTwoFactorEnabledEmailInput,
  sendUserTwoFactorDisabledInputSchema,
  sendUserTwoFactorEnabledInputSchema,
  SendWelcomeEmailInput,
  sendWelcomeEmailInputSchema,
} from '@repo/shared';
import bull from 'bull';
import z from 'zod';
@Processor(QUEUES.EMAIL)
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(private readonly mailService: MailService) {}

  @Process(JOB_PATTERNS.SEND_WELCOME_EMAIL)
  async sendWelcomeEmail(job: bull.Job<SendWelcomeEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendWelcomeEmailInputSchema, job.data);

    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Welcome to Our Service!',
      text: 'Thank you for registering with us.',
    });
  }

  @Process(JOB_PATTERNS.SEND_EMAIL_VERIFICATION_EMAIL)
  async sendEmailVerificationEmail(
    job: bull.Job<SendEmailVerificationEmailInput>,
  ) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendEmailVerificationEmailSchema, job.data);
    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Verify your email address',
      text: `Click the following link to verify your email: ${validated.verificationLink}`,
    });
  }

  @Process(JOB_PATTERNS.SEND_PASSWORD_RESET_EMAIL)
  async sendPasswordResetEmail(job: bull.Job<SendPasswordResetEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendPasswordResetEmailInputSchema, job.data);
    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: ${validated.resetLink}`,
    });
  }

  @Process(JOB_PATTERNS.SEND_PASSWORD_CHANGED_EMAIL)
  async sendPasswordChangedEmail(job: bull.Job<SendPasswordChangedEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendPasswordChangedEmailInputSchema, job.data);
    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Your Password Has Been Changed',
      text: 'This is a confirmation that your password has been successfully changed.',
    });
  }

  @Process(JOB_PATTERNS.SEND_TWO_FACTOR_ENABLED_EMAIL)
  async sendTwoFactorEnabledEmail(
    job: bull.Job<SendTwoFactorEnabledEmailInput>,
  ) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendUserTwoFactorEnabledInputSchema, job.data);
    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Two-factor authentication enabled',
      text: 'Two-factor authentication has been successfully enabled on your account.',
    });
  }

  @Process(JOB_PATTERNS.SEND_TWO_FACTOR_DISABLED_EMAIL)
  async sendTwoFactorDisabledEmail(
    job: bull.Job<SendTwoFactorDisabledEmailInput>,
  ) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendUserTwoFactorDisabledInputSchema, job.data);
    await this.mailService.send({
      to: [{ email: validated.email }],
      subject: 'Two-factor authentication disabled',
      text: 'Two-factor authentication has been successfully disabled on your account.',
    });
  }
}
