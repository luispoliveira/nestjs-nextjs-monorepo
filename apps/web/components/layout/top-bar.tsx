'use client';

import { useRouter } from 'next/navigation';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { RoleEnum } from '@repo/shared-types';

export function TopBar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // better-auth admin plugin adds `role` at runtime but the client types from
  // 'better-auth/plugins' (server import) don't surface it — safe cast here.
  const role = (session?.user as { role?: string } | undefined)?.role as
    | RoleEnum
    | undefined;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/sign-in');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        {session?.user?.name ? (
          <span className="text-sm font-medium">{session.user.name}</span>
        ) : null}
        {role ? (
          <Badge variant={role === RoleEnum.ADMIN ? 'default' : 'secondary'}>
            {role === RoleEnum.ADMIN ? 'Admin' : 'User'}
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
