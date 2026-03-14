import { authClient } from '@/lib/auth/client';
import { RoleEnum } from '@repo/shared-types';
import { redirect } from 'next/navigation';


export default async function UsersPage() {
  const { data: session } = await authClient.getSession();
  console.log("🚀 ~ UsersPage ~ session:", session)



  if (session?.user?.role !== RoleEnum.ADMIN) {
    redirect('/dashboard');
  }

  return <div className="text-sm text-muted-foreground">User management</div>;
}
