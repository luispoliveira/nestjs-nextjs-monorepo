import { getServerSession } from '@/lib/auth/server';
import { redirectTo } from '@/lib/redirect';

import { RoleEnum } from '@repo/shared-types';
import { UsersClient } from './users-client';

export default async function UsersPage() {
  const session = await getServerSession();

  if (!session || session.user.role !== RoleEnum.ADMIN) {
    redirectTo('/dashboard');
  }

  return <UsersClient />;
}

