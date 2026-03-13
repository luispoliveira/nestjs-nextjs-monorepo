import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userPasswordChangedInputSchema = z
  .object({
    userId: z.string(),
    email: z.email(),
    reason: z.string(),
  })
  .meta({ id: 'UserPasswordChanged' });

export class UserPasswordChangedInput extends createZodDto(
  userPasswordChangedInputSchema,
) {}
