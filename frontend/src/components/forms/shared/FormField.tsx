import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';

interface FormFieldProps {
  register: any;
  errors: any;
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
        {...register(name)}
        className={`${hasError ? 'border-red-500' : ''} ${className}`}
      />
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
