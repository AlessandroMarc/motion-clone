import type { UseFormRegisterReturn, FieldErrors, FieldValues } from 'react-hook-form';

/**
 * Shared types for React Hook Form components
 */
export interface FormFieldRegister {
  register: UseFormRegisterReturn;
}

export interface FormFieldErrors<TFieldValues extends FieldValues = Record<string, unknown>> {
  errors: FieldErrors<TFieldValues>;
}

export interface FormFieldProps<TFieldValues extends FieldValues = Record<string, unknown>> {
  register: UseFormRegisterReturn;
  errors: FieldErrors<TFieldValues>;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}
