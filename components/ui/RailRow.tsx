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
  /** Put the value on its own line under the title instead of the right edge, so a wide value
   *  (1167.32 kr) never squeezes the name */
  stacked?: boolean;
  /** error: a red dot · draft: an amber dot (unfinished); with no value, — */
  status?: 'error' | 'draft';
  onClick?: () => void;
  className?: string;
}

// Left-rail list item (Ledger lists/RailRow.jsx): selected = surface card with the accent ring,
// with the index badge on accent.
export function RailRow({ index, title, subtitle, value, stacked = false, selected = false, status, onClick, className }: RailRowProps) {
  const isError = status === 'error';
  const isDraft = status === 'draft';
  const valueNode =
    (value != null || status) && (
      <span
        className={cn(
          'flex items-center gap-1.5 font-numeric whitespace-nowrap',
          stacked ? 'mt-0.5 text-xs' : 'flex-none text-[13px]',
          isError ? 'text-danger' : isDraft ? 'text-draft' : selected ? 'text-ink' : 'text-ink-muted'
        )}
      >
        {status && (
          <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full', isError ? 'bg-danger' : 'bg-draft')} />
        )}
        {value ?? '—'}
      </span>
    );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        // Like the catalog lists: a hairline between rows, a surface fill on hover, and the chosen
        // row a surface card with the accent ring.
        'relative flex gap-2.5 w-full px-2.5 py-3 border border-transparent border-b-border text-left text-ink',
        'transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        selected ? 'rounded-row bg-surface border-accent shadow-focus' : 'hover:bg-surface hover:rounded-md',
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
        {stacked && valueNode}
        {subtitle && <span className="block mt-0.5 text-xs text-ink-muted">{subtitle}</span>}
      </span>
      {!stacked && valueNode}
    </button>
  );
}
