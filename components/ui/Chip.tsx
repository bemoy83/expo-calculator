import React from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends React.HTMLAttributes<HTMLElement> {
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
  | 'success'
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  disabled?: boolean
}

export const Chip: React.FC<ChipProps> = ({
  children,
  size = 'md',
  variant = 'default',
  leadingIcon,
  trailingIcon,
  className,
  disabled,
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
    success: 'bg-success text-md-on-primary-container',

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


  const isInteractive = typeof rest.onClick === 'function'
const Component = isInteractive ? 'button' as const : 'div'

if (isInteractive) {
  return (
    <button
      {...rest}
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 select-none transition-smooth cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-md-primary/50',
        // interaction motion
        'active:scale-[0.96] hover:elevation-2 active:elevation-1',
        sizes[size],
        variants[variant],
        disabled && 'opacity-60 cursor-not-allowed active:scale-100 hover:elevation-0',
        className
      )}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span className="truncate">{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </button>
  )

  }
  
  return (
    <div
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 select-none transition-smooth',
        sizes[size],
        variants[variant],
        disabled && 'opacity-60',
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

