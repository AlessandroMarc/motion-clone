'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import type { UseFormRegisterReturn, FieldErrors } from 'react-hook-form';
import { DatePicker } from './DatePicker';

interface FormDateFieldProps {
  register: UseFormRegisterReturn;
  errors: FieldErrors<Record<string, unknown>>;
  name: string;
  label: string;
  type?: 'date' | 'datetime-local';
  id?: string;
  className?: string;
}

export function FormDateField({
  register,
  errors,
  name,
  label,
  type: _type = 'date',
  id,
  className = '',
}: FormDateFieldProps) {
  const hasError = hasFieldError(errors, name);
  const errorMessage = getFieldError(errors, name);
  const fieldId = id || name;

  // Get form context for setValue and watch
  const { setValue, watch } = useFormContext();
  const formValue = watch(name);

  // Parse the date string to Date object
  const [dateValue, setDateValue] = useState<Date | undefined>(() => {
    if (!formValue) return undefined;
    try {
      // Handle both date strings (YYYY-MM-DD) and datetime strings
      const date = new Date(formValue);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  });

  // Update local state when form value changes
  useEffect(() => {
    if (!formValue) {
      setDateValue(undefined);
      return;
    }
    try {
      const date = new Date(formValue);
      setDateValue(isNaN(date.getTime()) ? undefined : date);
    } catch {
      setDateValue(undefined);
    }
  }, [formValue]);

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    if (date) {
      // Format as date string (YYYY-MM-DD) for date type
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      setValue(name, formatted, { shouldValidate: true });
    } else {
      setValue(name, '', { shouldValidate: true });
    }
  };

  return (
    <div className={className}>
      <DatePicker
        value={dateValue}
        onChange={handleDateChange}
        label={label}
        id={fieldId}
        error={hasError}
        showTime={false}
      />
      {hasError && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
      {/* Hidden input for react-hook-form */}
      <input type="hidden" {...register} />
    </div>
  );
}
