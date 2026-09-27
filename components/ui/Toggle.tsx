import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  /** Note on the right of a framed row, e.g. the material it adds */
  meta?: React.ReactNode;
  /** Bordered full-width row (default) or the bare switch */
  framed?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-describedby'?: string;
}

// A yes/no input as a switch (Ledger controls/Toggle.jsx). The knob slides; on = accent track.
export function Toggle({
  checked = false,
  onChange,
  label,
  meta,
  framed = true,
  disabled,
  id,
  className,
  'aria-describedby': describedBy,
}: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex items-center gap-3 text-left text-[15px] text-ink',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        'disabled:cursor-not-allowed disabled:opacity-50',
        framed ? 'w-full px-3.5 py-3 border border-border-strong rounded-row' : 'rounded-full',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative flex-none w-[38px] h-[22px] rounded-full transition-colors duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
          checked ? 'bg-accent' : 'bg-border-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] w-4 h-4 rounded-full transition-[left] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
            checked ? 'left-[19px] bg-accent-ink' : 'left-[3px] bg-surface'
          )}
        />
      </span>
      {label}
      {meta && <span className="ml-auto text-[13px] text-ink-muted">{meta}</span>}
    </button>
  );
}
