import { FormActions } from '@/components/forms/shared';
import { FolderPlus } from 'lucide-react';

interface ProjectFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  className?: string;
}

export function ProjectFormActions({
  isSubmitting,
  onCancel,
  submitText = 'Create Project',
  cancelText = 'Cancel',
  className = '',
}: ProjectFormActionsProps) {
  return (
    <FormActions
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      submitText={submitText}
      cancelText={cancelText}
      submitIcon={<FolderPlus className="mr-2 h-4 w-4" />}
      className={className}
    />
  );
}
