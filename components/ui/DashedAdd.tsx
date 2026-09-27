import React from 'react';
import { cn } from '@/lib/utils';

// Dashed "+ Add …" at the end of a list or canvas (Ledger lists/DashedAdd.jsx).
export function DashedAdd({
  onClick,
  radius = 'row',
  className,
  children,
}: {
  onClick?: () => void;
  /** row (10px, lists) · lg (12px, layout canvas sections) */
  radius?: 'row' | 'lg';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-[11px] border border-dashed border-border-strong text-center text-[13px] text-ink-muted',
        'transition-[background-color,color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        'hover:bg-surface-hover hover:text-ink',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        radius === 'lg' ? 'rounded-lg' : 'rounded-row',
        className
      )}
    >
      {children}
    </button>
  );
}
