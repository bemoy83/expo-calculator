import React from 'react';
import { cn } from '@/lib/utils';

// Green dot + LIVE + context at the top of a live pane (Ledger live/LiveLabel.jsx). Decorative:
// values recalculate as the user types either way.
export function LiveLabel({ label = 'Live', context, className }: { label?: string; context?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 font-numeric text-xs tracking-[.06em] uppercase', className)}>
      <span aria-hidden="true" className="w-[7px] h-[7px] rounded-full bg-committed" />
      <span className="text-committed font-semibold">{label}</span>
      {context && <span className="text-ink-faint">· {context}</span>}
    </div>
  );
}
