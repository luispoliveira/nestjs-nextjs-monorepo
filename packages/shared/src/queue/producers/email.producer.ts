import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import bull from 'bull';
import { ClsService } from 'nestjs-cls';
import { BaseProducer } from '../../abstracts';
import { JOB_PATTERNS, QUEUES } from '../../constants';
import {
  SendPasswordChangedEmailInput,
  SendPasswordResetEmailInput,
  SendWelcomeEmailInput,
} from '../input';

@Injectable()
export class EmailProducer extends BaseProducer {
  constructor(
    @InjectQueue(QUEUES.EMAIL) private readonly emailQueue: bull.Queue,
    protected clsService: ClsService,
  ) {
    super(emailQueue, clsService);
  }

  async sendWelcomeEmail(payload: SendWelcomeEmailInput) {
    const { email } = payload;

    await this.addJob(JOB_PATTERNS.SEND_WELCOME_EMAIL, { email });
  }

  async sendPasswordResetEmail(payload: SendPasswordResetEmailInput) {
    const { email, resetLink } = payload;

    await this.addJob(JOB_PATTERNS.SEND_PASSWORD_RESET_EMAIL, {
      email,
      resetLink,
    });
  }

  async sendPasswordChangedEmail(payload: SendPasswordChangedEmailInput) {
    const { email } = payload;

    await this.addJob(JOB_PATTERNS.SEND_PASSWORD_CHANGED_EMAIL, {
      email,
    });
  }
}
