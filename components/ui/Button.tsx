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
  const baseStyles = 'font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-accent hover:bg-accent/90 text-accent-foreground focus:ring-accent shadow-soft hover:shadow-elevated',
    secondary: 'bg-muted hover:bg-muted/80 text-foreground focus:ring-muted-foreground border border-border shadow-soft',
    danger: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive shadow-soft hover:shadow-elevated',
    ghost: 'bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground focus:ring-accent',
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

