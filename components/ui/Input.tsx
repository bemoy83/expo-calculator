import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2.5 bg-background border border-border rounded-xl',
          'text-foreground placeholder-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
          'transition-smooth shadow-soft focus:shadow-elevated',
          error && 'border-destructive focus:ring-destructive/50 focus:border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

