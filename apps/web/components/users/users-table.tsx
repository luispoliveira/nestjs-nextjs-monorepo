'use client';

import type { UserWithRole } from 'better-auth/plugins/admin';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleEnum } from '@repo/shared-types';
import { UserActionsMenu } from './user-actions-menu';

interface UsersTableProps {
  users: UserWithRole[];
  currentUserId: string;
  onRefetch: () => void;
}

export function UsersTable({ users, currentUserId, onRefetch }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge
                variant={
                  user.role === RoleEnum.ADMIN ? 'default' : 'secondary'
                }
              >
                {user.role ?? RoleEnum.USER}
              </Badge>
            </TableCell>
            <TableCell>
              {user.banned ? (
                <Badge variant="destructive">Banned</Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-green-500 text-green-600 dark:text-green-400"
                >
                  Active
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <UserActionsMenu
                user={user}
                currentUserId={currentUserId}
                onRefetch={onRefetch}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
