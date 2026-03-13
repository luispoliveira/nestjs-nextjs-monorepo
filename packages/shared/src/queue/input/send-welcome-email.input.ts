import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendWelcomeEmailInputSchema = z
  .object({
    email: z.email(),
    correlationId: z.uuid().optional(),
  })
  .meta({ id: 'SendWelcomeEmail' });

export class SendWelcomeEmailInput extends createZodDto(
  sendWelcomeEmailInputSchema,
) {}
