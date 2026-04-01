'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pin } from 'lucide-react';

interface PinnedTasksWarningDialogProps {
  open: boolean;
  pinnedTasks: Array<{ id: string; title: string }>;
  onConfirm: (unpinAll: boolean) => void;
  onCancel: () => void;
}

export function PinnedTasksWarningDialog({
  open,
  pinnedTasks,
  onConfirm,
  onCancel,
}: PinnedTasksWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-500" />
            Manually pinned tasks
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The following tasks are pinned to specific time slots. Auto-schedule
          would move or remove their sessions:
        </p>
        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
          {pinnedTasks.map(t => (
            <li key={t.id} className="flex items-center gap-2">
              <Pin className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="truncate">{t.title}</span>
            </li>
          ))}
        </ul>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            className="w-full sm:w-auto"
          >
            Keep pinned, skip them
          </Button>
          <Button onClick={() => onConfirm(true)} className="w-full sm:w-auto">
            Unpin all &amp; reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
