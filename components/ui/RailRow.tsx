import React from 'react';
import { cn } from '@/lib/utils';

interface RailRowProps {
  /** Shown as a two-digit badge: 01, 02 … */
  index?: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned mono value: line cost, count */
  value?: React.ReactNode;
  selected?: boolean;
  /** error shows a red dot (and — when there's no value) */
  status?: 'error';
  onClick?: () => void;
  className?: string;
}

// Left-rail list item (Ledger lists/RailRow.jsx): selected = surface + strong border, with the
// index badge on accent.
export function RailRow({ index, title, subtitle, value, selected = false, status, onClick, className }: RailRowProps) {
  const isError = status === 'error';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        'flex gap-2.5 w-full px-2.5 py-3 rounded-row border text-left text-ink',
        'transition-[background-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        selected ? 'bg-surface border-border-strong' : 'border-transparent hover:bg-surface-hover',
        className
      )}
    >
      {index != null && (
        <span
          className={cn(
            'h-fit px-[5px] py-0.5 rounded-[5px] font-numeric text-xs',
            selected ? 'bg-accent text-accent-ink font-semibold' : 'text-ink-faint'
          )}
        >
          {String(index).padStart(2, '0')}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {subtitle && <span className="block mt-0.5 text-xs text-ink-muted">{subtitle}</span>}
      </span>
      {(value != null || isError) && (
        <span
          className={cn(
            'flex-none flex items-center gap-1.5 font-numeric text-[13px]',
            isError ? 'text-danger' : selected ? 'text-ink' : 'text-ink-muted'
          )}
        >
          {isError && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-danger" />}
          {value ?? '—'}
        </span>
      )}
    </button>
  );
}
