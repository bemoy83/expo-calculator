import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  ...props
}) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        className={cn(
          'w-4 h-4 bg-card border-border rounded',
          'text-accent focus:ring-accent focus:ring-2',
          'cursor-pointer',
          className
        )}
        {...props}
      />
      {label && (
        <label className="ml-2 text-sm text-foreground cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};

