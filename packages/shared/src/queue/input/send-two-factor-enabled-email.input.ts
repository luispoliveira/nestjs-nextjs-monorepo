import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const sendUserTwoFactorEnabledInputSchema = z.object({
  email: z.email(),
  correlationId: z.uuid().optional(),
});

export class SendTwoFactorEnabledEmailInput extends createZodDto(
  sendUserTwoFactorEnabledInputSchema,
) {}
