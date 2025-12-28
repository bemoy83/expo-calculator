import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  className,
  required,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-md-on-surface mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={cn(
            // Base
            'w-full text-md-on-surface-variant appearance-none transition-smooth',
            'bg-md-surface-variant/70 dark:bg-md-surface-variant/50 rounded-full px-4 py-2.5',
          
            // Focus ring like Input
            'focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:border-md-primary',
          
            // Disabled
            'disabled-overlay disabled:cursor-not-allowed',
          
            // Error
            error && 'focus:ring-md-error/50 border-md-error/50',
          
            className
          )}
          
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none" 
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-md-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

