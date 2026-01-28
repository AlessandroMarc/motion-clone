import { Plus } from 'lucide-react';
import { FormActions, type FormActionsProps } from '@/components/forms/shared';

export interface TaskFormActionsProps extends FormActionsProps {
  submitText?: string;
  cancelText?: string;
  submittingText?: string;
  submitIcon?: FormActionsProps['submitIcon'];
}

export function TaskFormActions({
  submitText = 'Create Task',
  cancelText = 'Cancel',
  submittingText = 'Creating...',
  submitIcon = <Plus className="mr-2 h-4 w-4" />,
  ...rest
}: TaskFormActionsProps) {
  return (
    <FormActions
      {...rest}
      submitText={submitText}
      cancelText={cancelText}
      submittingText={submittingText}
      submitIcon={submitIcon}
    />
  );
}
