import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Pin } from 'lucide-react';

interface TaskManualPinFieldProps {
  isManuallyPinned: boolean;
  onIsManuallyPinnedChange: (checked: boolean) => void;
}

export function TaskManualPinField({
  isManuallyPinned,
  onIsManuallyPinnedChange,
}: TaskManualPinFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="is_manually_pinned"
        checked={isManuallyPinned}
        onCheckedChange={checked => onIsManuallyPinnedChange(checked === true)}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <Label
          htmlFor="is_manually_pinned"
          className="cursor-pointer font-medium flex items-center gap-1.5"
        >
          <Pin className="h-3 w-3 text-amber-500" />
          Manually pinned
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Keeps this task anchored to its scheduled time. Auto-schedule will
          warn before moving it.
        </p>
      </div>
    </div>
  );
}
