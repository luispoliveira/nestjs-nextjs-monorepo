import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendPasswordResetEmailInputSchema = z
  .object({
    email: z.email(),
    resetLink: z.url(),
    correlationId: z.uuid().optional(),
  })
  .meta({ id: 'SendPasswordResetEmail' });

export class SendPasswordResetEmailInput extends createZodDto(
  sendPasswordResetEmailInputSchema,
) {}
