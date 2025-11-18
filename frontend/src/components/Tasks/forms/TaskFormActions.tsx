import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

interface TaskFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  className?: string;
  submittingText?: string;
  submitIcon?: ReactNode;
}

export function TaskFormActions({
  isSubmitting,
  onCancel,
  submitText = 'Create Task',
  cancelText = 'Cancel',
  className = '',
  submittingText = 'Creating...',
  submitIcon,
}: TaskFormActionsProps) {
  return (
    <div className={`flex justify-end gap-3 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {submittingText}
          </>
        ) : (
          <>
            {submitIcon ?? <Plus className="mr-2 h-4 w-4" />}
            {submitText}
          </>
        )}
      </Button>
    </div>
  );
}
