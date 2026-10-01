import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'danger';
type Size = 'sm' | 'md';

/** The look of an icon-only button, for a link that should match: quiet until hovered. */
export function iconButtonClasses(variant: Variant = 'default', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex flex-none items-center justify-center rounded-md transition-colors duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
    size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
    variant === 'danger'
      ? 'text-ink-muted hover:bg-danger-bg hover:text-danger'
      : 'text-ink-muted hover:bg-surface hover:text-ink',
    className
  );
}

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'> {
  /** What the button does: its accessible name and its tooltip */
  label: string;
  /** A Lucide icon, 16px */
  icon: React.ReactNode;
  variant?: Variant;
  size?: Size;
}

// A button that is only an icon (Lucide, 16px), with its name in the tooltip and for screen readers.
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant, size, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={iconButtonClasses(variant, size, className)}
      {...props}
    >
      {icon}
    </button>
  )
);
IconButton.displayName = 'IconButton';
