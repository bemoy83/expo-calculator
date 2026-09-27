import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
  /** sm 32 · md 36 · lg 44 */
  size?: 'sm' | 'md' | 'lg';
  /** Full-width 46px call to action with the row radius */
  block?: boolean;
  icon?: React.ReactNode;
}

// Ledger buttons (design_handoff_ledger_redesign/components/controls/Button.jsx):
// accent = page-primary fill ("+ New …", Save), at most one per page header ·
// primary = ink, for committing actions (Send to quote, Export quote) ·
// secondary = outlined · ghost = quiet text · danger = red text · inverse = on an inverted block.
const variants = {
  accent: 'bg-accent text-accent-ink border-transparent hover:opacity-90',
  primary: 'bg-action-solid text-on-accent border-transparent hover:opacity-85',
  secondary: 'bg-transparent text-ink border-border-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-muted border-transparent hover:text-ink',
  danger: 'bg-transparent text-danger border-transparent hover:bg-danger-bg',
  inverse: 'bg-inverse-ink text-inverse border-transparent hover:opacity-90',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-[18px] text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 border font-semibold whitespace-nowrap',
        'transition-[background-color,color,opacity] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:bg-sunken disabled:text-ink-faint disabled:border-transparent disabled:opacity-100 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        block ? 'w-full h-[46px] rounded-row' : 'rounded-md',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
