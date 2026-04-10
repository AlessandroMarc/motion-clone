'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { googleCalendarService } from '@/services/googleCalendarService';

interface GoogleCalendarEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: {
    title?: string;
    description?: string;
    startTime: string;
    endTime: string;
    googleEventId?: string;
  };
  onSaved: () => void;
}

export function GoogleCalendarEventForm({
  open,
  onOpenChange,
  mode,
  initialData,
  onSaved,
}: GoogleCalendarEventFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when initialData changes (dialog opens with new data)
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
    setStartTime(initialData?.startTime || '');
    setEndTime(initialData?.endTime || '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Start and end times are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await googleCalendarService.createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        });
        toast.success('Google Calendar event created');
      } else {
        if (!initialData?.googleEventId) {
          toast.error('Cannot update: missing Google event ID');
          return;
        }
        await googleCalendarService.updateEvent(initialData.googleEventId, {
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        });
        toast.success('Google Calendar event updated');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Failed to save Google Calendar event:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to save event'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'New Google Calendar Event'
              : 'Edit Google Calendar Event'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gcal-title">Title</Label>
            <Input
              id="gcal-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcal-description">Description</Label>
            <Textarea
              id="gcal-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gcal-start">Start</Label>
              <Input
                id="gcal-start"
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gcal-end">End</Label>
              <Input
                id="gcal-end"
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Event'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
