import z from 'zod';
import { RoleEnum } from '../enums';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.email('Invalid email address'),
  role: z.enum(RoleEnum),
});

export const editRoleSchema = z.object({
  role: z.enum(RoleEnum),
});

export type EditRoleInput = z.infer<typeof editRoleSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;
