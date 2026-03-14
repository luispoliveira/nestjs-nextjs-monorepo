import { getServerSession } from '@/lib/auth/server';
import { RoleEnum } from '@repo/shared-types';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getServerSession();

  if (session?.user?.role !== RoleEnum.ADMIN) {
    redirect('/dashboard');
  }

  return <div className="text-sm text-muted-foreground">User management</div>;
}
