'use client';

import { FilterChip } from '@/components/ui/Chip';

interface CatalogCategoryChipsProps {
  categories: string[];
  counts: Map<string, number>;
  total: number;
  /** A category name, or 'all'. */
  selected: string;
  onSelect: (category: string) => void;
}

// Category filters (mockup 3c): All plus each category with its count. Choosing the active
// category again goes back to All.
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
          <FilterChip
            key={option.value}
            selected={active}
            count={option.count}
            onClick={() => onSelect(active && option.value !== 'all' ? 'all' : option.value)}
          >
            {option.label}
          </FilterChip>
        );
      })}
    </div>
  );
}
