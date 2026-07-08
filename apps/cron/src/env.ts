import { baseEnvSchema } from '@repo/shared';
import z from 'zod';

export const cronEnvSchema = baseEnvSchema.extend({
  CORS_ORIGIN: z.string().min(1),
});

export type CronEnv = z.infer<typeof cronEnvSchema>;
