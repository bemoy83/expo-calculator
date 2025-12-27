import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'underline';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className,
  variant = 'default',
  required,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const isUnderline = variant === 'underline';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-md-on-surface mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        aria-required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={cn(
          'w-full text-md-on-surface placeholder-md-on-surface-variant transition-smooth',
          'disabled-overlay disabled:cursor-not-allowed',
          isUnderline
            ? [
                'bg-md-surface-variant/70 dark:bg-md-surface-variant/50 border-0 border-b rounded-t-md',
                'px-2 py-1',
                'border-md-outline dark:border-white/10',
                'hover:!border-md-primary hover:!border-b-2',
                'focus:outline-none focus:!border-md-primary focus:!border-b-2',
                'focus:ring-0',
                error && '!border-md-error focus:!border-md-error hover:!border-md-error',
              ]
            : [
                'px-4 py-2.5 bg-md-surface-container-low rounded-full border border-md-outline/50',
                'focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:border-md-primary',
                error && 'focus:ring-md-error/50 border-md-error/50',
              ],
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-md-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

