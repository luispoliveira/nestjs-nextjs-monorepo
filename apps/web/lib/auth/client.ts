import { admin, twoFactor } from 'better-auth/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [twoFactor(), admin()],
});
