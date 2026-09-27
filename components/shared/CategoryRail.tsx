'use client';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { cn } from '@/lib/utils';

export const ALL_CATEGORIES = '';

// Category filter rail (mockups 6b, 3a): All plus each category with its count. A column from
// md up; a scrolling row of buttons on a phone.
export function CategoryRail({
  options,
  value,
  onChange,
}: {
  /** value '' is All */
  options: Array<{ value: string; label: string; count: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <nav
      aria-label="Categories"
      className="flex md:flex-col gap-0.5 px-3 py-3 md:py-4 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-border text-sm"
    >
      <Eyebrow className="hidden md:block px-2.5 pb-2">Category</Eyebrow>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex shrink-0 justify-between gap-3 px-2.5 py-[9px] rounded-md text-left transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              on ? 'bg-surface text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            )}
          >
            <span className="truncate">{option.label}</span>
            <span className={cn('font-numeric text-xs', on && 'text-ink-faint')}>{option.count}</span>
          </button>
        );
      })}
    </nav>
  );
}
