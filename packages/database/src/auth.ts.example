import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, twoFactor } from 'better-auth/plugins';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });
export const auth = betterAuth({
  appName: 'Nes(x)tJs Template',
  plugins: [twoFactor(), admin()],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
