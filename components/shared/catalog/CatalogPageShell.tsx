'use client';

import React, { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { PageHeader } from '@/components/shared/PageHeader';
import { SortableList } from '@/components/shared/SortableList';
import { cn } from '@/lib/utils';
import { CatalogItemBase } from './useCatalogListState';
import { CatalogCategoryChips } from './CatalogCategoryChips';
import { CatalogTabs, useCatalogTabItems } from './CatalogTabs';
import { useCatalogLayout, type CatalogColumn } from './CatalogTableRow';

interface CatalogPageShellProps<T extends CatalogItemBase> {
  /** The Catalog sub-tab this page is */
  tab: 'materials' | 'labor';
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
  /** Shown in the editor pane while no row is open, e.g. "Choose a material to edit it…" */
  editorPlaceholder: string;
}

export function CatalogPageShell<T extends CatalogItemBase>({
  tab,
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
  editorPlaceholder,
}: CatalogPageShellProps<T>) {
  const isEmptyCatalog = totalItems === 0;
  const editorRef = useRef<HTMLDivElement>(null);
  const tabs = useCatalogTabItems();

  // Below lg the panel stacks under the table, so bring it into view when it opens.
  useEffect(() => {
    if (isEditorOpen && window.matchMedia('(max-width: 1023px)').matches) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isEditorOpen]);

  return (
    <Layout>
      {/* From lg the page is exactly the window's height and each pane scrolls on its own. */}
      <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
        <PageHeader
          eyebrow="Catalog · Prices used by every calculator"
          title="Catalog"
          actions={
            <>
              <SearchInput
                value={searchQuery}
                onChange={onSearchQueryChange}
                placeholder={searchPlaceholder}
                className="flex-1 min-w-[10rem] sm:w-[240px] sm:flex-none"
              />
              <Button variant="accent" onClick={onAdd} className="shrink-0">
                + {addLabel}
              </Button>
            </>
          }
        >
          <CatalogTabs items={tabs} active={tab} />
        </PageHeader>

        {/* Table, then the editor pane: beside it from lg (always there), under it below lg (when open). */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] lg:flex-1 lg:min-h-0">
          <div className="min-w-0 flex flex-col gap-3.5 px-4 sm:px-6 py-4 pb-24 lg:overflow-y-auto">
            <CatalogCategoryChips
              categories={categories}
              counts={categoryCounts}
              total={totalItems}
              selected={categoryFilter}
              onSelect={onCategoryFilterChange}
            />

            {items.length === 0 ? (
              <div className="text-center px-6 py-16">
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
                  <Button variant="accent" onClick={onAdd}>
                    + {firstItemLabel}
                  </Button>
                )}
              </div>
            ) : (
              <CatalogTable title={title} columns={columns} gridTemplate={gridTemplate}>
                {canReorder ? (
                  <SortableList items={items} onReorder={onReorder} renderItem={(item) => renderRow(item, false)} />
                ) : (
                  items.map((item) => renderRow(item, true))
                )}
              </CatalogTable>
            )}
          </div>

          <div
            ref={editorRef}
            className={cn(
              'scroll-mt-20 bg-panel border-t lg:border-t-0 lg:border-l border-border',
              'lg:min-h-0 lg:overflow-hidden',
              !isEditorOpen && 'hidden lg:block'
            )}
          >
            {isEditorOpen ? (
              editor
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
                <p className="text-sm text-ink-muted">{editorPlaceholder}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const HEADER_CELL = 'font-numeric text-xs uppercase tracking-[.06em] text-ink-faint';

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
      style={{ '--catalog-cols': `20px ${gridTemplate}` } as React.CSSProperties}
    >
      <div role="row" className={cn(layout.header, layout.grid, 'gap-3.5 px-3 pb-2.5 border-b border-border')}>
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
