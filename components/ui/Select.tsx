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
            'w-full pl-4 pr-10 py-2.5 bg-md-surface-container-low rounded-full border border-md-outline/50',
            'text-md-on-surface appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:border-md-primary',
            'transition-smooth',
            'disabled-overlay disabled:cursor-not-allowed',
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

