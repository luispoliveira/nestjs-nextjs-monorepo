'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CopyIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authClient } from '@/lib/auth/client';
import { generatePassword } from '@/lib/utils';
import { CreateUserInput, createUserSchema, RoleEnum } from '@repo/shared-types';


interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: RoleEnum.USER,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: CreateUserInput) {
    setServerError(null);
    const password = generatePassword();

    const { error } = await authClient.admin.createUser({
      name: values.name,
      email: values.email,
      role: values.role,
      password,
    });

    if (error) {
      setServerError(error.message ?? 'Failed to create user.');
      return;
    }

    setGeneratedPassword(password);
    onOpenChange(false);
    form.reset();
    setPasswordDialogOpen(true);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePasswordDialogClose() {
    setPasswordDialogOpen(false);
    setGeneratedPassword('');
    onSuccess();
  }

  return (
    <>
      {/* Creation form dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. A temporary password will be
              generated upon creation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                aria-invalid={!!form.formState.errors.name}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                defaultValue={RoleEnum.USER}
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
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password reveal dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created</DialogTitle>
            <DialogDescription>
              The user has been created successfully. Copy the generated
              password below and share it securely.{' '}
              <strong>This password will not be shown again.</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="flex-1 break-all text-sm select-all">
                {generatedPassword}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy password"
              >
                {copied ? (
                  <CheckIcon className="size-4 text-green-500" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handlePasswordDialogClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
