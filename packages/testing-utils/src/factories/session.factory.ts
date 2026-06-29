import { PrismaClient } from '@repo/database';
import { randomUUID } from 'node:crypto';

export interface CreateSessionOverrides {
  id?: string;
  token?: string;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(
  db: PrismaClient,
  userId: string,
  overrides: CreateSessionOverrides = {},
) {
  const expiresAt =
    overrides.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

  return db.session.create({
    data: {
      id: overrides.id ?? randomUUID(),
      token: overrides.token ?? randomUUID(),
      userId,
      expiresAt,
      ipAddress: overrides.ipAddress ?? null,
      userAgent: overrides.userAgent ?? null,
    },
  });
}
