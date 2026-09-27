import React from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: React.ReactNode;
  /** Unit after the label in faint mono: m, cm, % */
  unit?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Grid columns to span inside a 3-up field grid */
  span?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}

const SPAN = { 1: '', 2: 'col-span-2', 3: 'col-span-3' };

// Label (+ mono unit) around an Input, Select or Segmented, with a hint or error line under it
// (Ledger controls/Field.jsx).
export function Field({ label, unit, hint, error, span = 1, className, children }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1.5 min-w-0', SPAN[span], className)}>
      <span className="text-xs text-ink-muted">
        {label}
        {unit && <span className="font-numeric text-ink-faint"> {unit}</span>}
      </span>
      {children}
      {(error || hint) && (
        <span className={cn('text-xs', error ? 'text-danger' : 'text-ink-faint')}>{error || hint}</span>
      )}
    </label>
  );
}
