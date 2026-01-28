import type { LucideIcon } from 'lucide-react';
import { Calendar, CheckSquare, FolderOpen, User } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const sidebarNavigation: NavItem[] = [
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Profile', href: '/profile', icon: User },
];
