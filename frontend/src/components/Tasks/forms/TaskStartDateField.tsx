'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { TaskFormData } from '@/hooks/useTaskForm';
import { DatePicker } from '@/components/forms/shared/DatePicker';

interface TaskStartDateFieldProps {
  register: UseFormRegister<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  id?: string;
  className?: string;
}

export function TaskStartDateField({
  register,
  errors,
  id = 'startDate',
  className = '',
}: TaskStartDateFieldProps) {
  const { setValue, watch } = useFormContext<TaskFormData>();
  const hasError = hasFieldError(errors, 'startDate');
  const errorMessage = getFieldError(errors, 'startDate');

  const formValue = watch('startDate');

  const parseDate = (value: string | null | undefined): Date | undefined => {
    if (!value) return undefined;

    try {
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

  useEffect(() => {
    const parsed = parseDate(formValue);
    setDateValue(parsed);
  }, [formValue]);

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      setValue('startDate', formatted, { shouldValidate: true });
    } else {
      setValue('startDate', undefined, { shouldValidate: true });
    }
  };

  return (
    <div className={className}>
      <DatePicker
        value={dateValue}
        onChange={handleDateChange}
        label="Start Date"
        id={id}
        error={hasError}
      />
      {hasError && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
      {/* Hidden input for react-hook-form */}
      <input type="hidden" {...register('startDate')} />
    </div>
  );
}
