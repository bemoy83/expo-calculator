'use client';

import React, { useEffect, useRef } from 'react';
import { CategoryRail } from '@/components/shared/CategoryRail';
import { cn } from '@/lib/utils';

export interface BrowseSide {
  /** The side pane's content: a quick view or an editor */
  content: React.ReactNode;
  /** Shown in place of the content while there is none, e.g. "Choose a material to edit it…" */
  placeholder?: string;
  /** Whether the content is there to show (an editor opened); a quick view is always there */
  open?: boolean;
  /** Below lg: hidden (a quick view; a row opens the item itself) or stacked under the list when open (an editor) */
  below?: 'hidden' | 'stack';
}

// The page the catalog and the lists share: the header, then categories · the list · a side pane
// (quick view or editor), each scrolling on its own from lg. Below lg the categories become a
// row of buttons and the side pane goes away or stacks under the list.
export function BrowseLayout({
  header,
  rail,
  side,
  children,
}: {
  header: React.ReactNode;
  rail: { options: Array<{ value: string; label: string; count: number }>; value: string; onChange: (value: string) => void };
  side: BrowseSide;
  children: React.ReactNode;
}) {
  const { below = 'hidden', open = true } = side;
  const sideRef = useRef<HTMLDivElement>(null);

  // Stacked below lg, the editor lands under the list: bring it into view when it opens.
  useEffect(() => {
    if (below === 'stack' && open && window.matchMedia('(max-width: 1023px)').matches) {
      sideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [below, open]);

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      {header}
      <div className="grid grid-cols-1 md:grid-cols-[var(--category-w)_minmax(0,1fr)] lg:grid-cols-[var(--category-w)_minmax(0,1fr)_var(--quickview-w)] lg:flex-1 lg:min-h-0">
        <CategoryRail options={rail.options} value={rail.value} onChange={rail.onChange} />
        <div className="min-w-0 flex flex-col px-3 py-4 pb-24 lg:overflow-y-auto">{children}</div>
        <aside
          ref={sideRef}
          aria-label="Details"
          className={cn(
            'scroll-mt-20 min-h-0 bg-panel border-t md:col-start-2 lg:col-start-3 lg:border-t-0 lg:border-l border-border lg:overflow-hidden',
            below === 'hidden' ? 'hidden lg:block' : !open && 'hidden lg:block'
          )}
        >
          {open ? (
            side.content
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-sm text-ink-muted">{side.placeholder}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
