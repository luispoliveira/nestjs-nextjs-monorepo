import { baseEnvSchema } from '@repo/shared';
import z from 'zod';

export const notificationsEnvSchema = baseEnvSchema.extend({
  CORS_ORIGIN: z.string().min(1),
});

export type NotificationsEnv = z.infer<typeof notificationsEnvSchema>;
