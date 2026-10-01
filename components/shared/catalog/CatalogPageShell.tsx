'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { BrowseActions } from '@/components/shared/browse/BrowseActions';
import { BrowseLayout } from '@/components/shared/browse/BrowseLayout';
import { FirstRunPane } from '@/components/shared/browse/FirstRunPane';
import { PageHeader } from '@/components/shared/PageHeader';
import { SortableList } from '@/components/shared/SortableList';
import { cn } from '@/lib/utils';
import { useCatalogLayout, type CatalogColumn } from './CatalogTableRow';

interface CatalogPageShellProps<T extends { id: string }> {
  title: string;
  /** Above the title: the count and what the page is for */
  eyebrow: string;
  /** What the + adds, e.g. "material" (lower case, for the first-run hint) */
  itemNoun: string;
  addLabel: string;
  searchPlaceholder: string;
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
  categoryOptions: Array<{ value: string; label: string; count: number }>;
  category: string;
  onCategoryChange: (value: string) => void;
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

export function CatalogPageShell<T extends { id: string }>({
  title,
  eyebrow,
  itemNoun,
  addLabel,
  searchPlaceholder,
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
  categoryOptions,
  category,
  onCategoryChange,
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
  return (
    <Layout>
      <BrowseLayout
        header={
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            actions={
              <BrowseActions
                search={searchQuery}
                onSearch={onSearchQueryChange}
                searchPlaceholder={searchPlaceholder}
                addLabel={addLabel}
                onAdd={onAdd}
              />
            }
          />
        }
        rail={{ options: categoryOptions, value: category, onChange: onCategoryChange }}
        side={{
          below: 'stack',
          open: isEditorOpen,
          placeholder: isEmptyCatalog ? (
            <FirstRunPane icon={EmptyIcon} title={emptyTitle} description={emptyDescription} addLabel={itemNoun} />
          ) : (
            editorPlaceholder
          ),
          content: editor,
        }}
      >
        {items.length === 0 ? (
          // An empty catalog says its piece in the side pane; a search that finds nothing, here.
          isEmptyCatalog ? null : (
            <div className="text-center px-6 py-16">
              <h2 className="text-base font-semibold text-ink mb-1">{emptyFilteredTitle}</h2>
              <p className="text-sm text-ink-muted max-w-md mx-auto">{emptyFilteredDescription}</p>
            </div>
          )
        ) : (
          <CatalogTable title={title} columns={columns} gridTemplate={gridTemplate}>
            {canReorder ? (
              <SortableList items={items} onReorder={onReorder} renderItem={(item) => renderRow(item, false)} />
            ) : (
              items.map((item) => renderRow(item, true))
            )}
          </CatalogTable>
        )}
      </BrowseLayout>
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
