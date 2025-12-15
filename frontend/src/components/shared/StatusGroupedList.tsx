import { Badge } from '@/components/ui/badge';
import { StatusConfig } from '@/utils/statusUtils';

interface StatusGroupedListProps<T> {
  items: T[];
  statusConfig: StatusConfig[];
  getItemStatus: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  renderEmptyState: (statusConfig: StatusConfig) => React.ReactNode;
  className?: string;
}

export function StatusGroupedList<T>({
  items,
  statusConfig,
  getItemStatus,
  renderItem,
  renderEmptyState,
  className = '',
}: StatusGroupedListProps<T>) {
  // Ensure items is an array
  const itemsArray = Array.isArray(items) ? items : [];

  // Group items by status
  const groupedItems = itemsArray.reduce(
    (acc, item) => {
      const status = getItemStatus(item);
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {statusConfig.map(({ key, label, icon: Icon, color }) => {
        const statusItems = groupedItems[key] || [];

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`h-4 w-4 ${color}`} />
              <h3 className="text-sm font-medium text-foreground">{label}</h3>
              <Badge variant="secondary" className="text-xs">
                {statusItems.length}
              </Badge>
            </div>

            {statusItems.length === 0 ? (
              renderEmptyState({ key, label, icon: Icon, color })
            ) : (
              <div className="space-y-2">
                {statusItems.map((item, index) => (
                  <div key={index}>{renderItem(item)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
