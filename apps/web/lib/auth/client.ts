import { adminClient } from 'better-auth/client/plugins';
import { twoFactorClient } from 'better-auth/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [twoFactorClient(), adminClient()],
});
