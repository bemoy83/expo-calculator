'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

// The search box and the add button in a browse page's header.
export function BrowseActions({
  search,
  onSearch,
  searchPlaceholder,
  addLabel,
  onAdd,
}: {
  /** Omit to leave the search box out (nothing to search yet) */
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  /** Omit to leave the add button out (a use-only device) */
  addLabel?: string;
  onAdd?: () => void;
}) {
  return (
    <>
      {search !== undefined && onSearch && (
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder={searchPlaceholder ?? 'Search…'}
          className="flex-1 min-w-[10rem] sm:w-[240px] sm:flex-none"
        />
      )}
      {addLabel && onAdd && (
        <Button variant="accent" onClick={onAdd} title={addLabel} aria-label={addLabel} className="shrink-0 w-9 px-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </>
  );
}
