import { Circle, Loader2, CheckCircle2 } from 'lucide-react';
import type { Task } from '@/types';

// Shared status configuration
export const STATUS_CONFIG: Record<
  string,
  { icon: typeof Circle; className: string; label?: string }
> = {
  pending: {
    icon: Circle,
    className: 'text-muted-foreground',
    label: 'Pending',
  },
  'not-started': {
    icon: Circle,
    className: 'text-muted-foreground',
    label: 'Not Started',
  },
  'in-progress': {
    icon: Loader2,
    className: 'text-blue-500',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle2,
    className: 'text-emerald-500',
    label: 'Completed',
  },
};

// Shared priority configuration
export const PRIORITY_CONFIG: Record<
  Task['priority'],
  { dotClass: string; borderClass: string; label?: string; bgClass?: string }
> = {
  high: {
    dotClass: 'bg-red-500',
    borderClass: 'border-l-red-500',
    label: 'High',
    bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  medium: {
    dotClass: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
    label: 'Medium',
    bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  low: {
    dotClass: 'bg-slate-400',
    borderClass: 'border-l-slate-400',
    label: 'Low',
    bgClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
};

// Re-export priority helpers from taskUtils for component convenience
export { TASK_PRIORITY_RANK, compareTaskPriority } from '@/utils/taskUtils';
