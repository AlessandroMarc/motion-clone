import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import type { UseFormRegisterReturn, FieldErrors } from 'react-hook-form';

interface FormTextareaProps {
  register: UseFormRegisterReturn;
  errors: FieldErrors<Record<string, unknown>>;
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}

export function FormTextarea({
  register,
  errors,
  name,
  label,
  placeholder,
  rows = 3,
  id,
  className = '',
}: FormTextareaProps) {
  const hasError = hasFieldError(errors, name);
  const errorMessage = getFieldError(errors, name);
  const fieldId = id || name;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        id={fieldId}
        placeholder={placeholder}
        rows={rows}
        {...register}
        className={`${hasError ? 'border-red-500' : ''} ${className}`}
      />
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
