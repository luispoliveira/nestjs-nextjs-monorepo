import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getServerSession } from '@/lib/auth/server';
import { RoleEnum } from '@repo/shared-types';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/sign-in');
  }

  const role = session.user.role as RoleEnum | undefined;

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <div className="flex min-h-svh flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
