import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendPasswordChangedEmailInputSchema = z
  .object({
    email: z.email(),
    correlationId: z.uuid().optional(),
  })
  .meta({ id: 'SendPasswordChangedEmail' });

export class SendPasswordChangedEmailInput extends createZodDto(
  sendPasswordChangedEmailInputSchema,
) {}
