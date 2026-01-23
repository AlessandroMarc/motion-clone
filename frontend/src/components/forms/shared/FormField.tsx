import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import type { UseFormRegisterReturn, FieldErrors } from 'react-hook-form';

interface FormFieldProps {
  register: UseFormRegisterReturn;
  errors: FieldErrors<Record<string, unknown>>;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export function FormField({
  register,
  errors,
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  id,
  className = '',
}: FormFieldProps) {
  const hasError = hasFieldError(errors, name);
  const errorMessage = getFieldError(errors, name);
  const fieldId = id || name;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={fieldId}
        type={type}
        placeholder={placeholder}
        {...register}
        className={`${hasError ? 'border-red-500' : ''} ${className}`}
      />
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
