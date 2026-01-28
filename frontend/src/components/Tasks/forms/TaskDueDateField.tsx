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

  // Parse the date value - handles both date strings (YYYY-MM-DD) and datetime strings
  const parseDate = (value: string | null | undefined): Date | undefined => {
    if (!value) return undefined;

    try {
      // Extract date part if it's a datetime string (YYYY-MM-DDTHH:mm or ISO)
      const datePart = value.includes('T') ? value.split('T')[0] : value;
      const [year, month, day] = datePart.split('-').map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return undefined;
      }

      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  };

  const [dateValue, setDateValue] = useState<Date | undefined>(() =>
    parseDate(formValue)
  );

  // Update local state when form value changes
  useEffect(() => {
    const parsed = parseDate(formValue);
    setDateValue(parsed);
  }, [formValue]);

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date) {
      // Format as date string (YYYY-MM-DD) only
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      setValue('dueDate', formatted, { shouldValidate: true });
    } else {
      setValue('dueDate', '', { shouldValidate: true });
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
      />
      {hasError && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
      {/* Hidden input for react-hook-form */}
      <input type="hidden" {...register('dueDate')} />
    </div>
  );
}
