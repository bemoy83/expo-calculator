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
          'w-4 h-4 bg-md-surface-container border-md-outline rounded',
          'text-md-primary focus:ring-md-primary focus:ring-2',
          'checked:bg-md-primary checked:border-md-primary',
          'cursor-pointer disabled-overlay disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className={cn(
          'ml-2 text-sm text-md-on-surface cursor-pointer',
          props.disabled && 'cursor-not-allowed opacity-[0.38]'
        )}>
          {label}
        </label>
      )}
    </div>
  );
};

