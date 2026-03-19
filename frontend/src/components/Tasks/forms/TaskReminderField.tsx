import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TaskReminderFieldProps {
  isReminder: boolean;
  onIsReminderChange: (checked: boolean) => void;
}

export function TaskReminderField({
  isReminder,
  onIsReminderChange,
}: TaskReminderFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="is_reminder"
        checked={isReminder}
        onCheckedChange={checked => onIsReminderChange(checked === true)}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor="is_reminder" className="cursor-pointer font-medium">
          Reminder only
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Appears in the calendar banner on the due date. Not auto-scheduled.
        </p>
      </div>
    </div>
  );
}
