import {
  CheckCircle2,
  Clock,
  Circle,
  Folder,
  FolderOpen,
  FolderCheck,
} from 'lucide-react';

export interface StatusConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const TASK_STATUS_CONFIG: StatusConfig[] = [
  { key: 'pending', label: 'Pending', icon: Circle, color: 'text-gray-400' },
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Clock,
    color: 'text-blue-500',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
];

export const PROJECT_STATUS_CONFIG: StatusConfig[] = [
  {
    key: 'not-started',
    label: 'Not Started',
    icon: Folder,
    color: 'text-gray-400',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: FolderOpen,
    color: 'text-blue-500',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: FolderCheck,
    color: 'text-green-500',
  },
];

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}
