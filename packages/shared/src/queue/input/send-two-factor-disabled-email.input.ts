import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendUserTwoFactorDisabledInputSchema = z.object({
  email: z.email(),
  correlationId: z.uuid().optional(),
});

export class SendTwoFactorDisabledEmailInput extends createZodDto(
  sendUserTwoFactorDisabledInputSchema,
) {}
