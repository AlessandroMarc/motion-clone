import { Circle, Loader2, CheckCircle2 } from 'lucide-react';
import type { Task } from '@shared/types';

// Shared status configuration
export const STATUS_CONFIG: Record<
  string,
  { icon: typeof Circle; className: string }
> = {
  pending: {
    icon: Circle,
    className: 'text-muted-foreground',
  },
  'not-started': {
    icon: Circle,
    className: 'text-muted-foreground',
  },
  'in-progress': {
    icon: Loader2,
    className: 'text-blue-500',
  },
  completed: {
    icon: CheckCircle2,
    className: 'text-emerald-500',
  },
};

// Shared priority configuration
export const PRIORITY_CONFIG: Record<
  Task['priority'],
  { dotClass: string; borderClass: string }
> = {
  high: {
    dotClass: 'bg-red-500',
    borderClass: 'border-l-red-500',
  },
  medium: {
    dotClass: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
  },
  low: {
    dotClass: 'bg-slate-400',
    borderClass: 'border-l-slate-400',
  },
};
