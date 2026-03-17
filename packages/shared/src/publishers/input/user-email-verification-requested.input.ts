import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userEmailVerificationRequestedSchema = z.object({
  userId: z.string(),
  email: z.email(),
  verificationToken: z.string(),
});

export class UserEmailVerificationRequestedInput extends createZodDto(
  userEmailVerificationRequestedSchema,
) {}
