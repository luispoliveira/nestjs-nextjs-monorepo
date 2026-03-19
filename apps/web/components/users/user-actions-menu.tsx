'use client';

import type { UserWithRole } from 'better-auth/plugins/admin';
import { MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth/client';
import { EditRoleDialog } from './edit-role-dialog';

type ConfirmAction = 'ban' | 'delete' | null;

interface UserActionsMenuProps {
  user: UserWithRole;
  currentUserId: string;
  onRefetch: () => void;
}

export function UserActionsMenu({
  user,
  currentUserId,
  onRefetch,
}: UserActionsMenuProps) {
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const isSelf = user.id === currentUserId;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleUnban() {
    const { error } = await authClient.admin.unbanUser({ userId: user.id });
    if (error) {
      toast.error(error.message ?? 'Failed to unban user.');
    } else {
      toast.success('User unbanned successfully.');
      onRefetch();
    }
  }

  async function handleConfirm() {
    if (confirmAction === 'ban') {
      const { error } = await authClient.admin.banUser({ userId: user.id });
      if (error) {
        toast.error(error.message ?? 'Failed to ban user.');
      } else {
        toast.success('User banned successfully.');
        onRefetch();
      }
    } else if (confirmAction === 'delete') {
      const { error } = await authClient.admin.removeUser({ userId: user.id });
      if (error) {
        toast.error(error.message ?? 'Failed to delete user.');
      } else {
        toast.success('User deleted successfully.');
        onRefetch();
      }
    }
    setConfirmAction(null);
  }

  // ── Alert dialog copy ────────────────────────────────────────────────────────

  const alertCopy =
    confirmAction === 'ban'
      ? {
        title: 'Ban User',
        description: `Are you sure you want to ban ${user.name ?? user.email}? They will no longer be able to sign in.`,
        action: 'Ban',
      }
      : {
        title: 'Delete User',
        description: `Are you sure you want to delete ${user.name ?? user.email}? This action cannot be undone.`,
        action: 'Delete',
      };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open actions menu">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {/* Edit Role */}
          <DropdownMenuItem onSelect={() => setEditRoleOpen(true)}>
            Edit Role
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Ban / Unban */}
          {user.banned ? (
            <DropdownMenuItem
              disabled={isSelf}
              className={isSelf ? 'text-muted-foreground' : ''}
              onSelect={handleUnban}
            >
              Unban User
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              className={isSelf ? 'text-muted-foreground' : 'text-destructive focus:text-destructive'}
              onSelect={() => !isSelf && setConfirmAction('ban')}
            >
              Ban User
            </DropdownMenuItem>
          )}

          {/* Delete */}
          <DropdownMenuItem
            disabled={isSelf}
            className={
              isSelf
                ? 'text-muted-foreground'
                : 'text-destructive focus:text-destructive'
            }
            onSelect={() => !isSelf && setConfirmAction('delete')}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Role dialog */}
      <EditRoleDialog
        user={editRoleOpen ? user : null}
        onSuccess={() => {
          setEditRoleOpen(false);
          onRefetch();
        }}
      />

      {/* Ban / Delete confirmation */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
            >
              {alertCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
