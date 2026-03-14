"use client";

import { useQueries } from "@tanstack/react-query";
import { type LucideIcon, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  total: number;
  isLoading: boolean;
}

function StatCard({ label, icon: Icon, total, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold">{total}</p>
        )}
      </CardContent>
    </Card>
  );
}

const statConfigs = [
  {
    label: "Total Users",
    icon: Users,
    queryKey: ["admin", "users", "total"],
    query: {},
  },
  {
    label: "Active Users",
    icon: UserCheck,
    queryKey: ["admin", "users", "active"],
    query: { filterField: "banned", filterOperator: "ne", filterValue: "true" },
  },
  {
    label: "Banned Users",
    icon: UserX,
    queryKey: ["admin", "users", "banned"],
    query: { filterField: "banned", filterOperator: "eq", filterValue: "true" },
  },
  {
    label: "Admins",
    icon: ShieldCheck,
    queryKey: ["admin", "users", "admins"],
    query: { filterField: "role", filterOperator: "eq", filterValue: "admin" },
  },
] as const;

export default function DashboardPage() {
  const results = useQueries({
    queries: statConfigs.map((stat) => ({
      queryKey: stat.queryKey,
      queryFn: () => authClient.admin.listUsers({ query: stat.query }),
    })),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Welcome to the dashboard! This is a protected page that only authenticated users can access.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statConfigs.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            icon={stat.icon}
            total={results[i].data?.data?.total ?? 0}
            isLoading={results[i].isLoading}
          />
        ))}
      </div>
    </div>
  );
}