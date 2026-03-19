import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/auth/server';

import { RoleEnum } from '@repo/shared-types';
import { UsersClient } from './users-client';

export default async function UsersPage() {
  const session = await getServerSession();

  if (!session || session.user.role !== RoleEnum.ADMIN) {
    redirect('/dashboard');
  }

  return <UsersClient />;
}

