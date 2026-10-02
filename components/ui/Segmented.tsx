import React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  options: { value: T; label: React.ReactNode; /** Tooltip, for icon-only options */ title?: string }[];
  value: T;
  onChange?: (value: T) => void;
  /** Stretch the segments to fill the width */
  block?: boolean;
  /** compact 32 · md 36 · large 46 (staff input) */
  size?: 'compact' | 'md' | 'large';
  mono?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
}

const HEIGHT = { compact: 'h-8', md: 'h-9', large: 'h-[46px]' };

// Segmented control on a field-filled track (Ledger controls/Segmented.jsx): the Parts/Layout switch,
// choice inputs shown as buttons, inspector options.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  block = false,
  size = 'md',
  mono = false,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      aria-labelledby={rest['aria-labelledby']}
      aria-describedby={rest['aria-describedby']}
      className={cn(
        block ? 'flex' : 'inline-flex',
        HEIGHT[size],
        'p-[3px] gap-[3px] rounded-md bg-field text-[13px]',
        mono ? 'font-numeric' : 'font-ui',
        className
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={option.title}
            onClick={() => onChange?.(option.value)}
            className={cn(
              'px-3.5 rounded-sm border whitespace-nowrap',
              'transition-[background-color,color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              block ? 'flex-1' : 'flex-none',
              on ? 'bg-field-raised text-ink font-semibold' : 'bg-transparent text-ink-muted hover:text-ink',
              'border-transparent'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
