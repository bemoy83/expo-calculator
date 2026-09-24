import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  id,
  className,
  required,
  ...props
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={checkboxId}
        required={required}
        aria-required={required}
        className={cn(
          'h-4 w-4 rounded-sm border-border-strong accent-action-solid cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className={cn(
          'ml-2 text-sm text-ink cursor-pointer',
          props.disabled && 'cursor-not-allowed text-ink-faint'
        )}>
          {label}
        </label>
      )}
    </div>
  );
};

