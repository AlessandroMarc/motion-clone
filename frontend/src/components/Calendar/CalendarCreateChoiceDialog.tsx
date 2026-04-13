'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ListChecks, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalendarCreateChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseTask: () => void;
  onChooseGoogleEvent: () => void;
  googleCalendarConnected: boolean;
  slotLabel?: string;
}

/**
 * Dialog that appears when clicking an empty calendar time slot.
 * Allows users to choose between creating a task or a Google Calendar event.
 * Disables Google Calendar option if not connected.
 */
export function CalendarCreateChoiceDialog({
  open,
  onOpenChange,
  onChooseTask,
  onChooseGoogleEvent,
  googleCalendarConnected,
  slotLabel,
}: CalendarCreateChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Create New</DialogTitle>
          {slotLabel && (
            <p className="text-sm text-muted-foreground">{slotLabel}</p>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="justify-start gap-3 h-14 text-left"
            onClick={onChooseTask}
          >
            <ListChecks className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Task</p>
              <p className="text-xs text-muted-foreground">
                Create a manually scheduled task
              </p>
            </div>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-14 text-left w-full"
                    onClick={onChooseGoogleEvent}
                    disabled={!googleCalendarConnected}
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium">Google Calendar Event</p>
                      <p className="text-xs text-muted-foreground">
                        Create an event on Google Calendar
                      </p>
                    </div>
                  </Button>
                </div>
              </TooltipTrigger>
              {!googleCalendarConnected && (
                <TooltipContent>
                  <p>Connect Google Calendar in Profile settings</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
