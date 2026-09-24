'use client';

import { cn } from '@/lib/utils';

interface CatalogCategoryChipsProps {
  categories: string[];
  counts: Map<string, number>;
  total: number;
  /** A category name, or 'all'. */
  selected: string;
  onSelect: (category: string) => void;
}

export function CatalogCategoryChips({
  categories,
  counts,
  total,
  selected,
  onSelect,
}: CatalogCategoryChipsProps) {
  if (categories.length === 0) return null;

  const options = [
    { value: 'all', label: 'All', count: total },
    ...categories.map((category) => ({ value: category, label: category, count: counts.get(category) ?? 0 })),
  ];

  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active && option.value !== 'all' ? 'all' : option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              active
                ? 'bg-action-solid text-on-accent border-transparent'
                : 'bg-surface text-ink-body border-border-strong hover:bg-surface-hover'
            )}
          >
            {option.label}
            <span className={cn('font-numeric', active ? 'text-on-accent/70' : 'text-ink-faint')}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
