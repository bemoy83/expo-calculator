'use client';

import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

type Align = 'left' | 'right';

export interface LedgerColumn {
  label: React.ReactNode;
  align?: Align;
  /** CSS grid track, default minmax(0,1fr) */
  width?: string;
}

const LedgerContext = createContext<{ template: string; aligns: Align[] }>({ template: '1fr', aligns: [] });

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
  const template = columns.map((column) => column.width || 'minmax(0,1fr)').join(' ');
  const aligns = columns.map((column) => column.align || 'left');
  return (
    <LedgerContext.Provider value={{ template, aligns }}>
      <div role="table" className={cn('flex flex-col text-ink', className)}>
        <div
          role="row"
          className="grid gap-4 px-3.5 pb-2.5 border-b border-border font-numeric text-xs tracking-[.06em] uppercase text-ink-faint"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((column, index) => (
            <span key={index} role="columnheader" className={aligns[index] === 'right' ? 'text-right' : 'text-left'}>
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
// is hovered, focused or selected (⋯ → Delete).
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
  const { template, aligns } = useContext(LedgerContext);
  return (
    <div
      role="row"
      aria-selected={onClick ? selected : undefined}
      onClick={onClick}
      className={cn(
        'group/ledger grid gap-4 items-center p-3.5 border-b border-border text-sm',
        'transition-[background-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        selected ? 'bg-surface rounded-md' : 'hover:bg-surface hover:rounded-md',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      style={{ gridTemplateColumns: template }}
    >
      {cells.map((cell, index) => {
        const align = aligns[index] === 'right' ? 'text-right' : 'text-left';
        const last = index === cells.length - 1;
        if (last && hoverCell) {
          return (
            <span key={index} role="cell" className={cn('min-w-0', align)}>
              <span className={selected ? 'hidden' : 'group-hover/ledger:hidden group-focus-within/ledger:hidden'}>{cell}</span>
              <span className={selected ? '' : 'hidden group-hover/ledger:inline group-focus-within/ledger:inline'}>{hoverCell}</span>
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
