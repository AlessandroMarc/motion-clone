'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: string; // ISO datetime string or empty
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

/**
 * Better datetime picker with separate date and time inputs
 * More intuitive than the native datetime-local picker
 */
export function DateTimePicker({
  value,
  onChange,
  label,
  id,
  className = '',
  error = false,
  disabled = false,
}: DateTimePickerProps) {
  // Parse the datetime value into date and time parts
  const getDateAndTime = (isoString: string) => {
    if (!isoString) return { date: '', time: '' };
    
    try {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const { date: initialDate, time: initialTime } = getDateAndTime(value);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  // Update local state when value prop changes
  useEffect(() => {
    const { date: newDate, time: newTime } = getDateAndTime(value);
    setDate(newDate);
    setTime(newTime);
  }, [value]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (newDate && time) {
      const datetime = `${newDate}T${time}`;
      onChange(datetime);
    } else if (newDate) {
      // If only date is set, use current time or default to 09:00
      const defaultTime = time || '09:00';
      onChange(`${newDate}T${defaultTime}`);
      setTime(defaultTime);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date && newTime) {
      const datetime = `${date}T${newTime}`;
      onChange(datetime);
    } else if (newTime) {
      // If only time is set, use today's date
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      setDate(todayStr);
      onChange(`${todayStr}T${newTime}`);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="grid grid-cols-2 gap-2">
        {/* Date input */}
        <div className="relative">
          <Input
            id={id ? `${id}-date` : undefined}
            type="date"
            value={date}
            onChange={e => handleDateChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'pr-10',
              error && 'border-red-500'
            )}
          />
          <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        
        {/* Time input */}
        <div className="relative">
          <Input
            id={id ? `${id}-time` : undefined}
            type="time"
            value={time}
            onChange={e => handleTimeChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'pr-10',
              error && 'border-red-500'
            )}
          />
          <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
