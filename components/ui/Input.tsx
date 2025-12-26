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
        <label htmlFor={inputId} className="block text-sm font-medium text-label-foreground mb-1.5">
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
          'w-full text-foreground placeholder-muted-foreground transition-smooth',
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:[&_*]:opacity-[0.38]',
          isUnderline
            ? [
                'bg-muted/70 dark:bg-muted/50 border-0 border-b rounded-t-md',
                'px-2 py-1',
                'border-border dark:border-white/10',
                'hover:!border-accent hover:!border-b-2',
                'focus:outline-none focus:!border-accent focus:!border-b-2',
                'focus:ring-0',
                error && '!border-destructive focus:!border-destructive hover:!border-destructive',
              ]
            : [
                'px-4 py-2.5 bg-input-bg rounded-full border border-border/50',
                'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
                error && 'focus:ring-destructive/50 border-destructive/50',
              ],
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

