import React from 'react';
import { cn } from '@/lib/utils';

// Mono uppercase section or page label (Ledger shell/Eyebrow.jsx): LINES, RESULTS,
// QUOTE Q-0142 · EDITED …
export function Eyebrow({
  tone = 'faint',
  tracking = 'section',
  as: Tag = 'div',
  className,
  children,
}: {
  /** faint (default) · live (green, bold) · ink */
  tone?: 'faint' | 'live' | 'ink';
  /** section = +0.06em (pane labels) · meta = +0.04em (page eyebrow) */
  tracking?: 'section' | 'meta';
  as?: 'div' | 'span' | 'h2' | 'h3' | 'p';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        'font-numeric text-xs uppercase',
        tracking === 'meta' ? 'tracking-[.04em]' : 'tracking-[.06em]',
        tone === 'live' ? 'text-committed font-semibold' : tone === 'ink' ? 'text-ink' : 'text-ink-faint',
        className
      )}
    >
      {children}
    </Tag>
  );
}
