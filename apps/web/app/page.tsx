import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/auth/server';

export default async function RootPage() {
  const session = await getServerSession();
  redirect(session ? '/dashboard' : '/sign-in');
}
