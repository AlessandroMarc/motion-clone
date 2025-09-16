import { TASK_STATUS_CONFIG, PROJECT_STATUS_CONFIG } from '@/utils/statusUtils';

interface StatusIconProps {
  status: string;
  type?: 'task' | 'project';
  className?: string;
}

export function StatusIcon({
  status,
  type = 'task',
  className = 'h-4 w-4',
}: StatusIconProps) {
  const statusConfigs =
    type === 'task' ? TASK_STATUS_CONFIG : PROJECT_STATUS_CONFIG;
  const statusConfig = statusConfigs.find(s => s.key === status);

  if (!statusConfig) return null;

  const Icon = statusConfig.icon;
  return <Icon className={`${className} ${statusConfig.color}`} />;
}
