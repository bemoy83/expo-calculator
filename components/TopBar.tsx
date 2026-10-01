'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGuardLink } from '@/components/shared/NavigationGuard';

export interface TopBarTab {
  id: string;
  label: string;
  /** An arrow between groups of tabs, showing the flow; has no label or link */
  separator?: boolean;
  /** Renders the tab as a link; otherwise it calls onSelect */
  href?: string;
}

interface TopBarProps {
  tabs: TopBarTab[];
  active: string;
  onSelect?: (id: string) => void;
  brand?: string;
  /** Makes the brand a link, e.g. home */
  brandHref?: string;
  /** Settings, avatar */
  right?: React.ReactNode;
  className?: string;
}

// 52px app bar (Ledger shell/TopBar.jsx): brand mark, the top-level tabs, a right-hand slot.
export function TopBar({ tabs, active, onSelect, brand = 'Cost Estimator', brandHref, right, className }: TopBarProps) {
  // An editor with unsaved edits asks before a tab leaves it.
  const guardLink = useGuardLink();
  const brandMark = (
    <>
      <span aria-hidden="true" className="w-[18px] h-[18px] rounded-xs bg-accent" />
      {brand}
    </>
  );
  const brandClasses = 'flex items-center gap-2.5 text-[15px] font-bold tracking-[-.01em]';
  return (
    <div
      className={cn(
        'h-[52px] flex-none flex items-center gap-7 px-6 border-b border-border bg-canvas text-ink',
        className
      )}
    >
      {brandHref ? (
        <Link
          href={brandHref}
          onClick={(event) => guardLink(brandHref, event)}
          className={cn(brandClasses, 'rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-action')}
        >
          {brandMark}
        </Link>
      ) : (
        <div className={brandClasses}>{brandMark}</div>
      )}
      <nav aria-label="Main" className="flex items-center gap-1 text-sm">
        {tabs.map((tab) => {
          if (tab.separator) {
            return <ChevronRight key={tab.id} aria-hidden="true" className="mx-1.5 h-3.5 w-3.5 self-center text-ink-faint" />;
          }
          const on = tab.id === active;
          const classes = cn(
            'px-3 py-[7px] rounded-[7px] transition-[background-color,color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
            on ? 'bg-surface text-ink font-semibold' : 'text-ink-muted hover:text-ink'
          );
          return tab.href ? (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={(event) => guardLink(tab.href!, event)}
              aria-current={on ? 'page' : undefined} className={classes}>
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onSelect?.(tab.id)}
              className={classes}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {right && <div className="ml-auto flex items-center gap-3.5 text-[13px] text-ink-muted">{right}</div>}
    </div>
  );
}
