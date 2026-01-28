'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  id?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  showTime?: boolean;
  timeValue?: string;
  onTimeChange?: (time: string) => void;
}

export function DatePicker({
  value,
  onChange,
  label,
  id,
  className = '',
  error = false,
  disabled = false,
  showTime = false,
  timeValue,
  onTimeChange,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (onTimeChange) {
      onTimeChange(newTime);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        className={cn(
          'flex gap-2',
          showTime && 'grid grid-cols-[1fr_minmax(5rem,auto)]'
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              data-empty={!value}
              className={cn(
                'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground min-w-0',
                error && 'border-red-500'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {value && !isNaN(value.getTime())
                  ? showTime
                    ? format(value, 'd MMM yy')
                    : format(value, 'PPP')
                  : 'Pick a date'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={date => {
                onChange(date);
                if (!showTime) {
                  setOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {showTime && (
          <Input
            id={id ? `${id}-time` : undefined}
            type="time"
            value={timeValue || ''}
            onChange={handleTimeChange}
            disabled={disabled}
            className={cn('min-w-0', error && 'border-red-500')}
          />
        )}
      </div>
    </div>
  );
}
