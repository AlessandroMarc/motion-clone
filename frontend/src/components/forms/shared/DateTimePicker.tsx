'use client';

import { useState, useEffect } from 'react';
import { DatePicker } from './DatePicker';

interface DateTimePickerProps {
  value: string; // ISO datetime string or empty (format: YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

/**
 * DateTime picker using shadcn/ui DatePicker with time support
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
  // Parse the datetime value into Date and time string
  const getDateAndTime = (isoString: string) => {
    if (!isoString) return { date: undefined, time: '' };
    
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return { date: undefined, time: '' };
      }
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return {
        date,
        time: `${hours}:${minutes}`,
      };
    } catch {
      return { date: undefined, time: '' };
    }
  };

  const { date: initialDate, time: initialTime } = getDateAndTime(value);
  const [dateValue, setDateValue] = useState<Date | undefined>(initialDate);
  const [timeValue, setTimeValue] = useState<string>(initialTime);

  // Update local state when value prop changes
  useEffect(() => {
    const { date: newDate, time: newTime } = getDateAndTime(value);
    setDateValue(newDate);
    setTimeValue(newTime);
  }, [value]);

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date && timeValue) {
      // Combine date and time
      const [hours, minutes] = timeValue.split(':');
      const combined = new Date(date);
      combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      // Format as datetime-local string (YYYY-MM-DDTHH:mm)
      const year = combined.getFullYear();
      const month = String(combined.getMonth() + 1).padStart(2, '0');
      const day = String(combined.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}T${timeValue}`);
    } else if (date) {
      // If only date is set, use current time or default to 09:00
      const defaultTime = timeValue || '09:00';
      const combined = new Date(date);
      const [hours, minutes] = defaultTime.split(':');
      combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      const year = combined.getFullYear();
      const month = String(combined.getMonth() + 1).padStart(2, '0');
      const day = String(combined.getDate()).padStart(2, '0');
      setTimeValue(defaultTime);
      onChange(`${year}-${month}-${day}T${defaultTime}`);
    } else {
      onChange('');
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (dateValue && time) {
      // Combine date and time
      const [hours, minutes] = time.split(':');
      const combined = new Date(dateValue);
      combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      // Format as datetime-local string
      const year = combined.getFullYear();
      const month = String(combined.getMonth() + 1).padStart(2, '0');
      const day = String(combined.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}T${time}`);
    } else if (time) {
      // If only time is set, use today's date
      const today = new Date();
      const [hours, minutes] = time.split(':');
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      setDateValue(today);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}T${time}`);
    }
  };

  return (
    <DatePicker
      value={dateValue}
      onChange={handleDateChange}
      label={label}
      id={id}
      className={className}
      error={error}
      disabled={disabled}
      showTime={true}
      timeValue={timeValue}
      onTimeChange={handleTimeChange}
    />
  );
}
