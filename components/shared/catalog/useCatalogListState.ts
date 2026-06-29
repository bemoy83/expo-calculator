'use client';

import { useEffect, useMemo, useState } from 'react';

export interface CatalogItemBase {
  id: string;
  name: string;
  category: string;
  order?: number;
}

interface UseCatalogListStateOptions<T extends CatalogItemBase> {
  items: T[];
  searchableText: (item: T) => Array<string | undefined>;
}

export function useCatalogListState<T extends CatalogItemBase>({
  items,
  searchableText,
}: UseCatalogListStateOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(items.map((item) => item.id))
  );

  useEffect(() => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        if (!next.has(item.id)) {
          next.add(item.id);
        }
      });
      return next;
    });
  }, [items]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category)))
      .filter((category) => category && category.toLowerCase() !== 'custom')
      .sort();
  }, [items]);

  const sortedByOrder = useMemo(() => {
    const originalIndex = new Map(items.map((item, index) => [item.id, index]));
    return [...items].sort((a, b) => {
      const orderA = a.order ?? originalIndex.get(a.id) ?? 0;
      const orderB = b.order ?? originalIndex.get(b.id) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = sortedByOrder;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        searchableText(item).some((value) => value?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [categoryFilter, searchQuery, searchableText, sortedByOrder]);

  const canReorder = !searchQuery.trim() && categoryFilter === 'all';

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeCollapsedId = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const reorder = (
    oldIndex: number,
    newIndex: number,
    updateOrder: (id: string, order: number) => void
  ) => {
    if (!canReorder) return;

    const ordered = [...sortedByOrder];
    const [moved] = ordered.splice(oldIndex, 1);
    if (!moved) return;
    ordered.splice(newIndex, 0, moved);

    ordered.forEach((item, index) => {
      if (item.order !== index) {
        updateOrder(item.id, index);
      }
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categories,
    sortedByOrder,
    filteredItems,
    canReorder,
    collapsedIds,
    toggleCollapse,
    removeCollapsedId,
    reorder,
  };
}
