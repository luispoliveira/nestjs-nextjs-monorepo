import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userPasswordResetRequestedInputSchema = z
  .object({
    userId: z.number(),
    email: z.email(),
    resetToken: z.string(),
    expiresAt: z.iso.datetime(),
  })
  .meta({ id: 'UserPasswordResetRequested' });
export class UserPasswordResetRequestedInput extends createZodDto(
  userPasswordResetRequestedInputSchema,
) {}
