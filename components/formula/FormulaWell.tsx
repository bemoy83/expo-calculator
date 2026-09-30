import React from 'react';
import { cn } from '@/lib/utils';

// Sunken mono well that shows a formula (Ledger builder/FormulaWell.jsx); focused = accent
// border + halo, as while the step is being edited.
export function FormulaWell({
  focused = false,
  className,
  children,
}: {
  focused?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'px-3.5 py-3 rounded-md bg-field font-numeric text-[15px] leading-[1.6] text-ink',
        'transition-[background-color,box-shadow] duration-150',
        focused && 'bg-field-hover [box-shadow:var(--field-focus)]',
        className
      )}
    >
      {children}
    </div>
  );
}
