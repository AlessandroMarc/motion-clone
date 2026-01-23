'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { TaskFormData } from '@/hooks/useTaskForm';
import { DatePicker } from '@/components/forms/shared/DatePicker';

interface TaskDueDateFieldProps {
  register: UseFormRegister<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  id?: string;
  className?: string;
}

export function TaskDueDateField({
  register,
  errors,
  id = 'dueDate',
  className = '',
}: TaskDueDateFieldProps) {
  const { setValue, watch } = useFormContext<TaskFormData>();
  const hasError = hasFieldError(errors, 'dueDate');
  const errorMessage = getFieldError(errors, 'dueDate');
  
  // Watch the form value
  const formValue = watch('dueDate');
  
  // Parse the datetime-local string to Date and time
  const [dateValue, setDateValue] = useState<Date | undefined>(() => {
    if (!formValue) return undefined;
    try {
      return new Date(formValue);
    } catch {
      return undefined;
    }
  });
  
  const [timeValue, setTimeValue] = useState<string>(() => {
    if (!formValue) return '';
    try {
      const date = new Date(formValue);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  });

  // Update local state when form value changes
  useEffect(() => {
    if (!formValue) {
      setDateValue(undefined);
      setTimeValue('');
      return;
    }
    try {
      const date = new Date(formValue);
      setDateValue(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setTimeValue(`${hours}:${minutes}`);
    } catch {
      setDateValue(undefined);
      setTimeValue('');
    }
  }, [formValue]);

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date && timeValue) {
      // Combine date and time
      const [hours, minutes] = timeValue.split(':');
      const combined = new Date(date);
      combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      // Format as datetime-local string
      const year = combined.getFullYear();
      const month = String(combined.getMonth() + 1).padStart(2, '0');
      const day = String(combined.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}T${timeValue}`;
      setValue('dueDate', formatted, { shouldValidate: true });
    } else if (date) {
      // If only date is set, use current time or default to 09:00
      const defaultTime = timeValue || '09:00';
      const combined = new Date(date);
      const [hours, minutes] = defaultTime.split(':');
      combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      const year = combined.getFullYear();
      const month = String(combined.getMonth() + 1).padStart(2, '0');
      const day = String(combined.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}T${defaultTime}`;
      setTimeValue(defaultTime);
      setValue('dueDate', formatted, { shouldValidate: true });
    } else {
      setValue('dueDate', '', { shouldValidate: true });
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
      const formatted = `${year}-${month}-${day}T${time}`;
      setValue('dueDate', formatted, { shouldValidate: true });
    } else if (time) {
      // If only time is set, use today's date
      const today = new Date();
      const [hours, minutes] = time.split(':');
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      setDateValue(today);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}T${time}`;
      setValue('dueDate', formatted, { shouldValidate: true });
    }
  };

  return (
    <div className={className}>
      <DatePicker
        value={dateValue}
        onChange={handleDateChange}
        label="Due Date"
        id={id}
        error={hasError}
        showTime={true}
        timeValue={timeValue}
        onTimeChange={handleTimeChange}
      />
      {hasError && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
      {/* Hidden input for react-hook-form */}
      <input
        type="hidden"
        {...register('dueDate')}
      />
    </div>
  );
}
