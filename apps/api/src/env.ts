import { baseEnvSchema } from '@repo/shared';
import z from 'zod';

export const apiEnvSchema = baseEnvSchema.extend({
  CORS_ORIGIN: z.string().min(1),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
