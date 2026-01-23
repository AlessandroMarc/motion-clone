'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

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
      <div className={cn('flex gap-2', showTime && 'grid grid-cols-2')}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal',
                !value && 'text-muted-foreground',
                error && 'border-red-500'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
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
          <div className="relative">
            <Input
              id={id ? `${id}-time` : undefined}
              type="time"
              value={timeValue || ''}
              onChange={handleTimeChange}
              disabled={disabled}
              className={cn(
                'pr-10',
                error && 'border-red-500'
              )}
            />
            <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
