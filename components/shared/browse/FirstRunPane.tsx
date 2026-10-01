import React from 'react';
import { Plus, type LucideIcon } from 'lucide-react';

// What the side pane says before anything exists: what this page is for, and how to add the first
// one with the + in the header. `hint` is left out where there's nothing to add (a use-only device).
export function FirstRunPane({
  icon: Icon,
  title,
  description,
  addLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** What the + adds, e.g. "material"; omit when there's no + */
  addLabel?: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sunken">
        <Icon className="h-6 w-6 text-ink-muted" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-[260px] text-sm text-ink-muted">{description}</p>
      {addLabel && (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
          Add one with
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-accent text-accent-ink"
          >
            <Plus className="h-3.5 w-3.5" />
          </span>
          <span className="sr-only">the plus button</span>
          above
        </p>
      )}
    </div>
  );
}
