import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChangeItem, ChangeType } from '@/content/changelog';

const typeConfig: Record<
  ChangeType,
  { label: string; className: string }
> = {
  new: {
    label: 'New',
    className:
      'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  improved: {
    label: 'Improved',
    className:
      'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  fixed: {
    label: 'Fixed',
    className:
      'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

interface ChangeItemRowProps {
  item: ChangeItem;
}

export function ChangeItemRow({ item }: ChangeItemRowProps) {
  const config = typeConfig[item.type];
  return (
    <li className="flex items-start gap-3">
      <Badge className={cn('mt-0.5 shrink-0', config.className)}>
        {config.label}
      </Badge>
      <span className="text-sm text-foreground leading-relaxed">{item.text}</span>
    </li>
  );
}
