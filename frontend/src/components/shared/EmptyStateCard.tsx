import { Card, CardContent } from '@/components/ui/card';
import { StatusConfig } from '@/utils/statusUtils';

interface EmptyStateCardProps {
  statusConfig: StatusConfig;
  message?: string;
}

export function EmptyStateCard({
  statusConfig,
  message = `No ${statusConfig.label.toLowerCase()} items`,
}: EmptyStateCardProps) {
  const Icon = statusConfig.icon;

  return (
    <Card className="border-1 border-dotted border-muted-foreground/25">
      <CardContent className="flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
