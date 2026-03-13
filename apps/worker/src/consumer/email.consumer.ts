import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import {
  JOB_PATTERNS,
  QUEUES,
  SendPasswordChangedEmailInput,
  sendPasswordChangedEmailInputSchema,
  SendPasswordResetEmailInput,
  sendPasswordResetEmailInputSchema,
  SendWelcomeEmailInput,
  sendWelcomeEmailInputSchema,
} from '@repo/shared';
import bull from 'bull';
import z from 'zod';

@Processor(QUEUES.EMAIL)
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor() {}

  @Process(JOB_PATTERNS.SEND_WELCOME_EMAIL)
  async sendWelcomeEmail(job: bull.Job<SendWelcomeEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendWelcomeEmailInputSchema, job.data);
  }

  async sendPasswordResetEmail(job: bull.Job<SendPasswordResetEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendPasswordResetEmailInputSchema, job.data);
  }

  async sendPasswordChangedEmail(job: bull.Job<SendPasswordChangedEmailInput>) {
    this.logger.log(
      `Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
    );
    const validated = z.parse(sendPasswordChangedEmailInputSchema, job.data);
  }
}
