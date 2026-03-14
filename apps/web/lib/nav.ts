import { LayoutDashboard, LucideIcon, Users } from 'lucide-react';

export const navItems: {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    adminOnly: true,
  },
];
