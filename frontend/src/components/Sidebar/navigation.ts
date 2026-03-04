import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CheckSquare,
  FolderOpen,
  User,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
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

export const supportNavigation: NavItem[] = [
  { name: 'Need Help?', href: '/support/need-help', icon: HelpCircle },
];
