import { PrismaClient } from '@repo/database';
import { faker } from '@faker-js/faker';
import { randomUUID, scryptSync, randomBytes } from 'node:crypto';

export const TEST_PASSWORD = 'Test1234!';

// Cache the hash so tests don't pay the scrypt cost more than once per run
let cachedHash: string | null = null;

function hashPassword(password: string): string {
  if (cachedHash) return cachedHash;
  // Match better-auth's format exactly: `${salt}:${hex(key)}`
  // Parameters: N=16384, r=16, p=1, keylen=64
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2, // 64MB - matches better-auth's @noble/hashes/scrypt maxmem
  });
  cachedHash = `${salt}:${derivedKey.toString('hex')}`;
  return cachedHash;
}

export interface CreateUserOverrides {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  hashedPassword?: string;
}

export async function createUser(
  db: PrismaClient,
  overrides: CreateUserOverrides = {},
) {
  const userId = overrides.id ?? randomUUID();
  const email = overrides.email ?? faker.internet.email();
  const name = overrides.name ?? faker.person.fullName();
  const role = overrides.role ?? 'user';
  const emailVerified = overrides.emailVerified ?? false;
  const hashedPassword =
    overrides.hashedPassword ?? hashPassword(TEST_PASSWORD);

  const user = await db.user.create({
    data: {
      id: userId,
      email,
      name,
      role,
      emailVerified,
    },
  });

  await db.account.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
    },
  });

  return user;
}
