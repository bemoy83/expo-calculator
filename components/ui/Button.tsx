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
  const baseStyles = 'font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:[&_*]:opacity-[0.38]';
  
  const variants = {
    primary: 'bg-accent text-accent-foreground focus:ring-accent shadow-sm hover:shadow-md hover-overlay',
    secondary: 'bg-muted text-foreground focus:ring-muted-foreground border border-border shadow-sm hover-overlay',
    danger: 'bg-destructive text-destructive-foreground focus:ring-destructive shadow-sm hover:shadow-md hover-overlay',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground focus:ring-accent hover-overlay',
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

