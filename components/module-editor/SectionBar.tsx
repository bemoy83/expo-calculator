'use client';

import type { ReactNode } from 'react';

// Section heading for the module editor: caps label, count, and an action on the right.
export function SectionBar({
  id,
  title,
  count,
  action,
}: {
  id: string;
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </h2>
      {count !== undefined && <span className="text-[11px] font-numeric text-ink-faint">{count}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
