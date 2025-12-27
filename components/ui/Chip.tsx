import React from 'react';
import { cn } from '@/lib/utils';

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement | HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'selected' | 'outline' | 'dashed';
  size?: 'sm' | 'md';
  as?: 'span' | 'button';
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  as: Component = 'span',
  className,
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-full font-medium transition-all inline-flex items-center';
  
  const variants = {
    default: 'bg-md-tertiary text-md-on-tertiary',
    selected: 'bg-md-primary text-md-on-primary elevation-1',
    outline: 'bg-md-tertiary text-md-on-tertiary border border-border',
    dashed: 'bg-md-tertiary text-md-on-tertiary border border-border border-dashed',
  };
  
  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
  };
  
  const hoverStyles = Component === 'button' && variant === 'default' 
    ? 'hover:bg-md-tertiary/80 hover:text-md-on-tertiary' 
    : '';
  
  const classes = cn(
    baseStyles,
    variants[variant],
    sizes[size],
    hoverStyles,
    className
  );
  
  if (Component === 'button') {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }
  
  return (
    <span
      className={classes}
      {...(props as React.HTMLAttributes<HTMLSpanElement>)}
    >
      {children}
    </span>
  );
};

