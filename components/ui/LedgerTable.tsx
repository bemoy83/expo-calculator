'use client';

import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

type Align = 'left' | 'right';

export interface LedgerColumn {
  label: React.ReactNode;
  align?: Align;
  /** CSS grid track, default minmax(0,1fr) */
  width?: string;
  /** Left out below sm, where the ledger has no room for it */
  hideOnMobile?: boolean;
}

type LedgerLayout = { style: React.CSSProperties; aligns: Align[]; hidden: boolean[] };

const LedgerContext = createContext<LedgerLayout>({ style: {}, aligns: [], hidden: [] });

// Rows set their grid from two variables: every column from sm up, the phone subset below it.
const GRID = 'grid [grid-template-columns:var(--ledger-sm)] sm:[grid-template-columns:var(--ledger)]';
const HIDE_ON_MOBILE = 'hidden sm:block';

// Ledger table (Ledger lists/LedgerTable.jsx): a mono uppercase header row, and rows that share
// its grid template. Numbers go in right-aligned columns.
export function LedgerTable({
  columns,
  className,
  children,
}: {
  columns: LedgerColumn[];
  className?: string;
  children: React.ReactNode;
}) {
  const track = (column: LedgerColumn) => column.width || 'minmax(0,1fr)';
  const style = {
    '--ledger': columns.map(track).join(' '),
    '--ledger-sm': columns.filter((column) => !column.hideOnMobile).map(track).join(' '),
  } as React.CSSProperties;
  const aligns = columns.map((column) => column.align || 'left');
  const hidden = columns.map((column) => !!column.hideOnMobile);
  return (
    <LedgerContext.Provider value={{ style, aligns, hidden }}>
      <div role="table" className={cn('flex flex-col text-ink', className)}>
        <div
          role="row"
          className={cn(GRID, 'gap-4 px-3.5 pb-2.5 border-b border-border font-numeric text-xs tracking-[.06em] uppercase text-ink-faint')}
          style={style}
        >
          {columns.map((column, index) => (
            <span
              key={index}
              role="columnheader"
              className={cn(aligns[index] === 'right' ? 'text-right' : 'text-left', hidden[index] && HIDE_ON_MOBILE)}
            >
              {column.label}
            </span>
          ))}
        </div>
        {children}
      </div>
    </LedgerContext.Provider>
  );
}

// One row; hover and selected lift it to surface. hoverCell replaces the last cell while the row
// is hovered, focused or selected (⋯ → Delete); on touch screens, which can't hover, it always shows.
export function LedgerRow({
  cells,
  selected = false,
  onClick,
  hoverCell,
  className,
}: {
  cells: React.ReactNode[];
  selected?: boolean;
  onClick?: () => void;
  hoverCell?: React.ReactNode;
  className?: string;
}) {
  const { style, aligns, hidden } = useContext(LedgerContext);
  return (
    <div
      role="row"
      aria-selected={onClick ? selected : undefined}
      data-selected={selected || undefined}
      onClick={onClick}
      className={cn(
        'ledger-row', GRID, 'gap-4 items-center p-3.5 border-b border-border text-sm',
        'transition-[background-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        selected ? 'bg-surface rounded-md' : 'hover:bg-surface hover:rounded-md',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      style={style}
    >
      {cells.map((cell, index) => {
        const align = cn(aligns[index] === 'right' ? 'text-right' : 'text-left', hidden[index] && HIDE_ON_MOBILE);
        const last = index === cells.length - 1;
        if (last && hoverCell) {
          return (
            <span key={index} role="cell" className={cn('min-w-0', align)}>
              <span className="ledger-idle">{cell}</span>
              <span className="ledger-hover">{hoverCell}</span>
            </span>
          );
        }
        return (
          <span key={index} role="cell" className={cn('min-w-0', align)}>
            {cell}
          </span>
        );
      })}
    </div>
  );
}
