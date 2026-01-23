'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/forms/shared/DateTimePicker';

interface CalendarCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  onCreate: () => void;
}

function CalendarCreateDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  description,
  setDescription,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  onCreate,
}: CalendarCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create calendar event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-title">Title</Label>
            <Input
              id="calendar-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateTimePicker
              value={startTime}
              onChange={setStartTime}
              label="Start"
              id="calendar-start"
            />
            <DateTimePicker
              value={endTime}
              onChange={setEndTime}
              label="End"
              id="calendar-end"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-description">Description</Label>
            <Textarea
              id="calendar-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!title || !startTime || !endTime}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CalendarCreateDialog;
