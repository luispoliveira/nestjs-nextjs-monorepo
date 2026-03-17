import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendEmailVerificationEmailSchema = z.object({
  email: z.email(),
  correlationId: z.uuid().optional(),
});

export class SendEmailVerificationEmailInput extends createZodDto(
  sendEmailVerificationEmailSchema,
) {}
