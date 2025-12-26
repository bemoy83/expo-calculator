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
    <div className={cn('flex items-center', props.disabled && 'opacity-60')}>
      <input
        type="checkbox"
        id={checkboxId}
        required={required}
        aria-required={required}
        className={cn(
          'w-4 h-4 bg-card border-border rounded',
          'text-accent focus:ring-accent focus:ring-2',
          'cursor-pointer disabled:cursor-not-allowed',
          'disabled:opacity-[0.38]',
          className
        )}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className={cn(
          'ml-2 text-sm text-label-foreground cursor-pointer',
          props.disabled && 'cursor-not-allowed opacity-[0.38]'
        )}>
          {label}
        </label>
      )}
    </div>
  );
};

