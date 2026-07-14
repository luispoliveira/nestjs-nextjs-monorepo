import { getServerSession } from '@/lib/auth/server';
import { redirectTo } from '@/lib/redirect';

export default async function RootPage() {
  const session = await getServerSession();
  redirectTo(session ? '/dashboard' : '/sign-in');
}
