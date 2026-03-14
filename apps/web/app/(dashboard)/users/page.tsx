import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/auth/server';

import { UsersClient } from './users-client';

export default async function UsersPage() {
  const session = await getServerSession();

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <UsersClient />;
}

