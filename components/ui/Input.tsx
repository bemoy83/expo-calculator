import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { FIELD_ERROR, FIELD_LABEL, fieldClasses } from './field-styles';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, className, required, type, ...props }) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        required={required}
        aria-required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        // Numbers are always set in tabular mono.
        className={fieldClasses(!!error, cn('h-[38px] px-2.5', type === 'number' && 'font-numeric', className))}
        {...props}
      />
      {error && (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
