'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UserWithRole } from 'better-auth/plugins/admin';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { UsersTable } from '@/components/users/users-table';
import { authClient } from '@/lib/auth/client';

type RoleFilter = 'all' | 'admin' | 'user';
type StatusFilter = 'all' | 'active' | 'banned';

type ListUsersQuery = Parameters<typeof authClient.admin.listUsers>[0]['query'];

export function UsersClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  // Debounce search at 300 ms; reset to first page on new search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // The API supports a single filterField at a time.
  // statusFilter takes API priority; when both status + role are active
  // the role is applied client-side after the API returns results.
  const filterParams = ((): Pick<
    ListUsersQuery,
    'filterField' | 'filterOperator' | 'filterValue'
  > => {
    if (statusFilter !== 'all') {
      return {
        filterField: 'banned',
        filterOperator: 'eq',
        filterValue: statusFilter === 'banned',
      };
    }
    if (roleFilter !== 'all') {
      return {
        filterField: 'role',
        filterOperator: 'eq',
        filterValue: roleFilter,
      };
    }
    return {};
  })();

  const searchParams = debouncedSearch
    ? {
      searchValue: debouncedSearch,
      searchField: 'email' as const,
      searchOperator: 'contains' as const,
    }
    : {};

  const apiQuery: ListUsersQuery = {
    limit: pageSize,
    offset: page * pageSize,
    ...searchParams,
    ...filterParams,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', 'list', apiQuery],
    queryFn: () => authClient.admin.listUsers({ query: apiQuery }),
  });

  const rawUsers = (data?.data?.users ?? []) as UserWithRole[];

  // Apply role filter client-side only when status filter is also active
  const users =
    statusFilter !== 'all' && roleFilter !== 'all'
      ? rawUsers.filter((u) => u.role === roleFilter)
      : rawUsers;

  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button onClick={() => setCreateOpen(true)}>New User</Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as RoleFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UsersTable users={users} onRefetch={refetch} />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          refetch();
        }}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} user{total !== 1 ? 's' : ''} total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
