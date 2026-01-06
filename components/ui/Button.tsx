import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-md-surface inline-flex items-center justify-center active:scale-[0.98] disabled-overlay disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-md-primary hover:bg-md-primary/90 text-md-on-primary focus:ring-md-primary elevation-1 hover-glow',
    secondary: 'bg-md-secondary hover:bg-md-secondary/90 text-md-on-secondary focus:ring-md-secondary elevation-1 hover-glow',
    danger: 'bg-md-error text-md-on-error focus:ring-md-error elevation-1 hover-glow hover-overlay',
    ghost: 'bg-transparent text-md-on-surface-variant hover:text-md-on-surface focus:ring-md-primary hover-overlay',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

