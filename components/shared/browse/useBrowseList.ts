'use client';

import { useMemo, useState } from 'react';

/** The category value that means "no category filter". */
export const ALL_CATEGORIES = '';
export const OTHER_CATEGORY = 'Other';

export interface BrowseItem {
  id: string;
  /** Place in the list, set by dragging */
  order?: number;
}

interface UseBrowseListOptions<T extends BrowseItem> {
  items: T[];
  searchableText: (item: T) => Array<string | undefined>;
  /** An item's category; empty falls under "Other" */
  categoryOf: (item: T) => string;
  /** Categories to leave out of the rail (their items still show under All) */
  hiddenCategory?: (category: string) => boolean;
  /** The order of items that haven't been dragged yet; the items as stored when omitted */
  defaultOrder?: (items: T[]) => T[];
  /** The category filter, when the page keeps it somewhere (the address); else kept here */
  category?: string;
  onCategoryChange?: (category: string) => void;
}

// What every browse page does with its list: search, a category rail, the order the user
// dragged (items nobody has dragged yet keep their default order), and whether dragging makes
// sense: not while the list is filtered, since a filtered list can't say where the rest go.
export function useBrowseList<T extends BrowseItem>({
  items,
  searchableText,
  categoryOf,
  hiddenCategory,
  defaultOrder,
  category: controlledCategory,
  onCategoryChange,
}: UseBrowseListOptions<T>) {
  const [search, setSearch] = useState('');
  const [ownCategory, setOwnCategory] = useState(ALL_CATEGORIES);
  const category = controlledCategory ?? ownCategory;
  const setCategory = onCategoryChange ?? setOwnCategory;

  const categoryName = (item: T) => categoryOf(item).trim() || OTHER_CATEGORY;

  const railOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(categoryName(item), (counts.get(categoryName(item)) ?? 0) + 1);
    const named = [...counts.entries()]
      .filter(([name]) => !hiddenCategory?.(name))
      .sort(([a], [b]) => (a === OTHER_CATEGORY ? 1 : b === OTHER_CATEGORY ? -1 : a.localeCompare(b)))
      .map(([name, count]) => ({ value: name, label: name, count }));
    return [{ value: ALL_CATEGORIES, label: 'All', count: items.length }, ...named];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hiddenCategory]);

  const ordered = useMemo(() => {
    const base = defaultOrder ? defaultOrder(items) : items;
    const position = new Map(base.map((item, index) => [item.id, index]));
    return [...base].sort((a, b) => (a.order ?? position.get(a.id) ?? 0) - (b.order ?? position.get(b.id) ?? 0));
  }, [items, defaultOrder]);

  const listed = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return ordered
      .filter((item) => category === ALL_CATEGORIES || categoryName(item) === category)
      .filter((item) => !needle || searchableText(item).some((text) => text?.toLowerCase().includes(needle)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, category, search, searchableText]);

  const canReorder = !search.trim() && category === ALL_CATEGORIES;

  /** Moves one item in the full list and hands the new order over, when the list isn't filtered. */
  const reorder = (oldIndex: number, newIndex: number, onReorderItems: (orderedItems: T[]) => void) => {
    if (!canReorder) return;
    const next = [...ordered];
    const [moved] = next.splice(oldIndex, 1);
    if (!moved) return;
    next.splice(newIndex, 0, moved);
    onReorderItems(next);
  };

  return { search, setSearch, category, setCategory, railOptions, ordered, listed, canReorder, reorder };
}
