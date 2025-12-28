import React from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?:
  | 'default'
  | 'selected'
  | 'outline'
  | 'dashed'
  | 'primary'
  | 'primaryTonal'
  | 'error'
  | 'errorTonal'
  | 'ghost'
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

export const Chip: React.FC<ChipProps> = ({
  children,
  size = 'md',
  variant = 'default',
  leadingIcon,
  trailingIcon,
  className,
  ...rest
}) => {
  const sizes = {
    sm: 'text-xs px-2.5 py-1 rounded-full',
    md: 'text-sm px-3 py-1.5 rounded-full',
    lg: 'text-base px-4 py-2 rounded-full'
  }

  const variants = {
    default: 'bg-md-tertiary text-md-on-tertiary',

    // strong emphasis
    primary: 'bg-md-primary text-md-on-primary',
    error: 'bg-md-error text-md-on-error',

    // md3 tonal emphasis
    primaryTonal: 'bg-md-primary-container text-md-on-primary-container',
    errorTonal: 'bg-md-error-container text-md-on-error-container',

    // selection state
    selected: 'bg-md-primary text-md-on-primary elevation-1',

    // structural emphasis
    outline:
      'bg-md-surface-container-high text-md-on-surface border border-md-outline',
    dashed:
      'bg-md-surface-container-high text-md-on-surface border border-md-outline border-dashed',

    // minimal
    ghost:
      'bg-transparent text-md-on-surface border border-transparent hover:bg-md-surface-variant/40'
  }

  return (
    <div
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 select-none transition-smooth',
        sizes[size],
        variants[variant],
        className
      )}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span className="truncate">{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </div>
  )
}

export default Chip
