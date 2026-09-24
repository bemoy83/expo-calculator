'use client';

import React, { useEffect, useRef } from 'react';
import { LucideIcon, Plus, Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { SortableList } from '@/components/shared/SortableList';
import { cn } from '@/lib/utils';
import { CatalogItemBase } from './useCatalogListState';
import { CatalogCategoryChips } from './CatalogCategoryChips';
import { CatalogLayoutProvider, useCatalogLayout, type CatalogColumn } from './CatalogTableRow';

interface CatalogPageShellProps<T extends CatalogItemBase> {
  title: string;
  addLabel: string;
  searchPlaceholder: string;
  firstItemLabel: string;
  emptyTitle: string;
  emptyFilteredTitle: string;
  emptyDescription: string;
  emptyFilteredDescription: string;
  emptyIcon: LucideIcon;
  items: T[];
  totalItems: number;
  isEditorOpen: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  categories: string[];
  categoryCounts: Map<string, number>;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  canReorder: boolean;
  onAdd: () => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  /** Column headers after the name column, matching the cells each row renders. */
  columns: CatalogColumn[];
  /** CSS grid-template-columns for the name column plus `columns`; the drag-handle column is added. */
  gridTemplate: string;
  renderRow: (item: T, disableDrag: boolean) => React.ReactNode;
  editor?: React.ReactNode;
}

export function CatalogPageShell<T extends CatalogItemBase>({
  title,
  addLabel,
  searchPlaceholder,
  firstItemLabel,
  emptyTitle,
  emptyFilteredTitle,
  emptyDescription,
  emptyFilteredDescription,
  emptyIcon: EmptyIcon,
  items,
  totalItems,
  isEditorOpen,
  searchQuery,
  onSearchQueryChange,
  categories,
  categoryCounts,
  categoryFilter,
  onCategoryFilterChange,
  canReorder,
  onAdd,
  onReorder,
  columns,
  gridTemplate,
  renderRow,
  editor,
}: CatalogPageShellProps<T>) {
  const isEmptyCatalog = totalItems === 0;
  const editorRef = useRef<HTMLDivElement>(null);

  // Below lg the panel stacks under the table, so bring it into view when it opens.
  useEffect(() => {
    if (isEditorOpen && window.matchMedia('(max-width: 1023px)').matches) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isEditorOpen]);

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="text-xs text-ink-muted">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder.replace(/…$/, '')}
              className="w-full h-9 pl-8 pr-3 rounded-md bg-surface border border-border-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>
          <Button onClick={onAdd} size="sm" className="shrink-0 h-9">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {addLabel}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-5 pb-24 items-start',
          isEditorOpen && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]'
        )}
      >
        <div className="min-w-0 space-y-3">
          <CatalogCategoryChips
            categories={categories}
            counts={categoryCounts}
            total={totalItems}
            selected={categoryFilter}
            onSelect={onCategoryFilterChange}
          />

          {items.length === 0 ? (
            <div className="rounded-lg border border-border-strong bg-surface text-center px-6 py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sunken mb-4">
                <EmptyIcon className="h-7 w-7 text-ink-muted" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-ink mb-1">
                {isEmptyCatalog ? emptyTitle : emptyFilteredTitle}
              </h2>
              <p className="text-sm text-ink-muted max-w-md mx-auto mb-5">
                {isEmptyCatalog ? emptyDescription : emptyFilteredDescription}
              </p>
              {isEmptyCatalog && (
                <Button onClick={onAdd} size="sm">
                  <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {firstItemLabel}
                </Button>
              )}
            </div>
          ) : (
            <CatalogLayoutProvider value={isEditorOpen ? 'compact' : 'full'}>
              <CatalogTable title={title} columns={columns} gridTemplate={gridTemplate}>
                {canReorder ? (
                  <SortableList
                    items={items}
                    onReorder={onReorder}
                    renderItem={(item) => renderRow(item, false)}
                  />
                ) : (
                  items.map((item) => renderRow(item, true))
                )}
              </CatalogTable>
            </CatalogLayoutProvider>
          )}
        </div>

        {isEditorOpen && (
          <div ref={editorRef} className="lg:sticky lg:top-sticky-offset scroll-mt-20">
            {editor}
          </div>
        )}
      </div>
    </Layout>
  );
}

const HEADER_CELL = 'text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint';

function CatalogTable({
  title,
  columns,
  gridTemplate,
  children,
}: {
  title: string;
  columns: CatalogColumn[];
  gridTemplate: string;
  children: React.ReactNode;
}) {
  const layout = useCatalogLayout();
  return (
    <div
      role="table"
      aria-label={title}
      className="rounded-lg border border-border-strong bg-surface overflow-hidden"
      style={{ '--catalog-cols': `20px ${gridTemplate}` } as React.CSSProperties}
    >
      <div
        role="row"
        className={cn(layout.header, layout.grid, 'gap-3 px-3.5 py-2.5 bg-sunken-2 border-b border-border')}
      >
        <span role="columnheader" aria-hidden="true" />
        <span role="columnheader" className={HEADER_CELL}>Name</span>
        {columns.map((column) => (
          <span
            key={column.label}
            role="columnheader"
            className={cn(HEADER_CELL, column.align === 'right' && 'text-right')}
          >
            {column.label}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
