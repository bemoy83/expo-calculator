'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface CatalogTab {
  id: string;
  label: string;
  count?: number;
  /** Renders the tab as a link; otherwise it calls onSelect */
  href?: string;
}

// Underline sub-tabs for the Catalog (Ledger shell/CatalogTabs.jsx): Materials · Labor ·
// Functions, with counts. Sits in PageHeader's children.
export function CatalogTabs({
  items,
  active,
  onSelect,
  className,
}: {
  items: CatalogTab[];
  active: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Catalog" className={cn('flex gap-[22px] text-sm', className)}>
      {items.map((item) => {
        const on = item.id === active;
        const classes = cn(
          'flex items-baseline gap-1.5 pb-[11px] border-b-2',
          'transition-[color,border-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
          'focus:outline-none focus-visible:text-ink focus-visible:border-border-strong',
          on ? 'border-accent text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink'
        );
        const content = (
          <>
            {item.label}
            {item.count != null && <span className="font-numeric text-xs font-normal text-ink-faint">{item.count}</span>}
          </>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} aria-current={on ? 'page' : undefined} className={classes}>
            {content}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect?.(item.id)}
            className={classes}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
