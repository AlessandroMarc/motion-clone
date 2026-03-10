import { CheckCircle2, Copy, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFormActions } from './TaskFormActions';

interface TaskActionButtonsProps {
  taskCompleted: boolean;
  isSubmitting: boolean;
  onComplete: () => void;
  onClone: () => void;
  onCancel: () => void;
}

export function TaskActionButtons({
  taskCompleted,
  isSubmitting,
  onComplete,
  onClone,
  onCancel,
}: TaskActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant={taskCompleted ? 'outline' : 'default'}
          onClick={onComplete}
          disabled={isSubmitting}
          className="gap-2 flex-1 sm:flex-none"
        >
          {taskCompleted ? (
            <>
              <RotateCcw className="h-4 w-4" />
              Reopen Task
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClone}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          <Copy className="mr-2 h-4 w-4" />
          Clone
        </Button>
      </div>
      <TaskFormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitText="Save"
        submittingText="Saving..."
        submitIcon={<Save className="mr-2 h-4 w-4" />}
        cancelText="Close"
        className="flex flex-col sm:flex-row gap-2 [&>button]:flex-1 sm:[&>button]:flex-none sm:[&>button:last-child]:ml-auto"
      />
    </div>
  );
}
