import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import type { UseFormRegisterReturn, FieldErrors } from 'react-hook-form';

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
  type = 'date',
  id,
  className = '',
}: FormDateFieldProps) {
  const hasError = hasFieldError(errors, name);
  const errorMessage = getFieldError(errors, name);
  const fieldId = id || name;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        <Input
          id={fieldId}
          type={type}
          {...register}
          className={`${hasError ? 'border-red-500' : ''} ${className}`}
        />
        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
