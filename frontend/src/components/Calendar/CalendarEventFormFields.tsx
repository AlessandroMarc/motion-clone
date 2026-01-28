'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/forms/shared/DateTimePicker';

export interface CalendarEventFormFieldsProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  /** When true, start/end datetime inputs are read-only (e.g. in edit mode). */
  dateTimeDisabled?: boolean;
}

export function CalendarEventFormFields({
  title,
  setTitle,
  description,
  setDescription,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  dateTimeDisabled = false,
}: CalendarEventFormFieldsProps): React.ReactElement {
  return (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
        <div className="min-w-0">
          <DateTimePicker
            value={startTime}
            onChange={setStartTime}
            label="Start"
            id="calendar-start"
            disabled={dateTimeDisabled}
          />
        </div>
        <div className="min-w-0">
          <DateTimePicker
            value={endTime}
            onChange={setEndTime}
            label="End"
            id="calendar-end"
            disabled={dateTimeDisabled}
          />
        </div>
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
  );
}
