'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';

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

/** Materials · Labor · Functions with their counts (after mount: the stores load from localStorage). */
export function useCatalogTabItems(): CatalogTab[] {
  const [mounted, setMounted] = React.useState(false);
  const materials = useMaterialsStore((state) => state.materials.length);
  const labor = useLaborStore((state) => state.labor.length);
  const functions = useFunctionsStore((state) => state.functions.length);
  React.useEffect(() => setMounted(true), []);
  return [
    { id: 'materials', label: 'Materials', href: '/materials', count: mounted ? materials : undefined },
    { id: 'labor', label: 'Labor', href: '/labor', count: mounted ? labor : undefined },
    { id: 'functions', label: 'Functions', href: '/functions', count: mounted ? functions : undefined },
  ];
}
