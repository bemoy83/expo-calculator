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
  | 'muted'
  | 'flat'
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

  // Pills (999 radius). Roles follow mockup 1a: neutral, solid action, tonal action
  // (fields), tonal committed/green (materials, locked), tonal danger.
  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-full',
    lg: 'text-sm px-3 py-1.5 rounded-full'
  }

  const variants = {
    // neutral
    default: 'bg-sunken text-ink-body',
    flat: 'bg-sunken text-ink-body',
    muted: 'bg-sunken text-ink-muted',

    // strong emphasis
    primary: 'bg-action-solid text-on-accent',
    selected: 'bg-action-solid text-on-accent',
    error: 'bg-danger text-on-accent',

    // tonal emphasis
    primaryTonal: 'bg-action-bg text-action',
    errorTonal: 'bg-danger-bg text-danger',
    success: 'bg-committed-bg text-committed',

    // structural emphasis
    outline: 'bg-surface text-ink-body border border-border-strong',
    dashed: 'bg-surface text-ink-body border border-border-strong border-dashed',

    // minimal
    ghost: 'bg-transparent text-ink-body border border-transparent hover:bg-surface-hover'
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
        'inline-flex items-center gap-1 font-medium select-none transition-opacity cursor-pointer hover:opacity-80',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        sizes[size],
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed hover:opacity-50',
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
        'inline-flex items-center gap-1 font-medium select-none',
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








