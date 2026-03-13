import { Injectable } from '@nestjs/common';
import { EmailProducer } from '@repo/shared';

@Injectable()
export class AppService {
  constructor(private readonly producer: EmailProducer) {}

  async sendUserCreatedNotification(email: string) {
    await this.producer.sendWelcomeEmail({
      email,
    });
  }

  async sendPasswordResetNotification(email: string, resetLink: string) {
    await this.producer.sendPasswordResetEmail({
      email,
      resetLink,
    });
  }

  async sendPasswordChangeConfirmation(email: string) {
    await this.producer.sendPasswordChangedEmail({
      email,
    });
  }
}
