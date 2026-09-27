import React from 'react';
import { cn } from '@/lib/utils';

interface ResultRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  /** accent-soft background, for the step being edited */
  highlight?: boolean;
  /** Bold label, no leader, 26px mono value (Line total) */
  total?: boolean;
  leader?: boolean;
  /** Mono line under the label, e.g. "30.8 m · 4 × 2.5 m" */
  detail?: React.ReactNode;
  className?: string;
}

// A result: label, dotted leader, mono value + faint unit (Ledger live/ResultRow.jsx).
export function ResultRow({ label, value, unit, highlight = false, total = false, leader = true, detail, className }: ResultRowProps) {
  if (total) {
    return (
      <div className={cn('flex items-baseline gap-2.5 text-ink', className)}>
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="flex-1" />
        <span className="font-numeric text-[26px] font-semibold tracking-[-.02em]">{value}</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex items-baseline gap-2.5 text-[15px] text-ink',
        highlight && 'px-2.5 py-2 -mx-2.5 rounded-md bg-accent-soft',
        className
      )}
    >
      <span className="min-w-0">
        {label}
        {detail && <span className="block mt-[3px] font-numeric text-xs text-ink-faint">{detail}</span>}
      </span>
      <span aria-hidden="true" className={cn('flex-1', leader && !highlight && 'border-b border-dotted border-border-strong')} />
      <span className="font-numeric whitespace-nowrap">
        {value}
        {unit && <span className="text-ink-faint"> {unit}</span>}
      </span>
    </div>
  );
}
