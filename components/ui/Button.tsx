import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

// Design primitives (mockup 1a / 3a): 6px control radius, 13px semibold label.
// primary = solid action · secondary = surface with strong border · ghost = quiet text ·
// danger = surface with danger text and border.
const variants = {
  primary: 'bg-action-solid text-on-accent border-transparent hover:bg-action-solid/85',
  secondary: 'bg-surface text-ink border-border-strong hover:bg-surface-hover',
  danger: 'bg-surface text-danger border-danger-border hover:bg-danger-bg',
  ghost: 'bg-transparent text-ink-muted border-transparent hover:text-ink hover:bg-surface-hover',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-10 px-5 text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-semibold whitespace-nowrap transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:bg-sunken disabled:text-ink-faint disabled:border-transparent disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
