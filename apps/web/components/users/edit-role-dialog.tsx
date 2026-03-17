'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { UserWithRole } from 'better-auth/plugins/admin';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authClient } from '@/lib/auth/client';
import { EditRoleInput, editRoleSchema, RoleEnum } from '@repo/shared-types';


interface EditRoleDialogProps {
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditRoleDialog({ user, onSuccess }: EditRoleDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const open = user !== null;

  const form = useForm<EditRoleInput>({
    resolver: zodResolver(editRoleSchema),
    values: {
      role: (user?.role as RoleEnum) ?? RoleEnum.USER,
    },
  });

  const { isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setServerError(null);
      onSuccess();
    }
  }

  async function onSubmit(values: EditRoleInput) {
    if (!user) return;

    setServerError(null);

    const { error } = await authClient.admin.setRole({
      userId: user.id,
      role: values.role,
    });

    if (error) {
      setServerError(error.message ?? 'Failed to update role.');
      return;
    }

    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Change the role for{' '}
            <span className="font-medium">{user?.name ?? user?.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(value) =>
                form.setValue('role', value as RoleEnum, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RoleEnum.USER}>User</SelectItem>
                <SelectItem value={RoleEnum.ADMIN}>Admin</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-destructive text-xs">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm">{serverError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
