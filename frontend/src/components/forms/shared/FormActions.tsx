import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export interface FormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  submitIcon?: ReactNode;
  submittingText?: string;
  className?: string;
}

export function FormActions({
  isSubmitting,
  onCancel,
  submitText = 'Create',
  cancelText = 'Cancel',
  submitIcon = <Plus className="mr-2 h-4 w-4" />,
  submittingText = 'Creating...',
  className = '',
}: FormActionsProps) {
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
            {submitIcon}
            {submitText}
          </>
        )}
      </Button>
    </div>
  );
}
