'use client';

import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SortableList } from '@/components/shared/SortableList';
import { CatalogItemBase } from './useCatalogListState';
import { CatalogSearchFilter } from './CatalogSearchFilter';

interface CatalogPageShellProps<T extends CatalogItemBase> {
  title: string;
  description: string;
  addLabel: string;
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
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  canReorder: boolean;
  onAdd: () => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  renderItem: (item: T, disableDrag: boolean) => React.ReactNode;
  editor?: React.ReactNode;
}

export function CatalogPageShell<T extends CatalogItemBase>({
  title,
  description,
  addLabel,
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
  categoryFilter,
  onCategoryFilterChange,
  canReorder,
  onAdd,
  onReorder,
  renderItem,
  editor,
}: CatalogPageShellProps<T>) {
  const isEmptyCatalog = totalItems === 0;

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-md-primary mb-2 tracking-tight">{title}</h1>
          <p className="text-lg text-md-on-surface-variant">{description}</p>
        </div>
        <Button onClick={onAdd} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          {addLabel}
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-6 pb-24 ${isEditorOpen ? 'lg:grid-cols-5' : 'lg:grid-cols-1'}`}>
        <div className={isEditorOpen ? 'lg:col-span-3 space-y-5' : 'lg:col-span-1 space-y-5'}>
          <CatalogSearchFilter
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            categories={categories}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={onCategoryFilterChange}
          />

          {items.length === 0 ? (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-md-surface-variant elevation-1 mb-5">
                  <EmptyIcon className="h-10 w-10 text-md-on-surface-variant" />
                </div>
                <h3 className="text-lg font-bold text-md-primary mb-2 tracking-tight">
                  {isEmptyCatalog ? emptyTitle : emptyFilteredTitle}
                </h3>
                <p className="text-base text-md-on-surface-variant max-w-md mx-auto leading-relaxed mb-5">
                  {isEmptyCatalog ? emptyDescription : emptyFilteredDescription}
                </p>
                {isEmptyCatalog && (
                  <Button onClick={onAdd} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {firstItemLabel}
                  </Button>
                )}
              </div>
            </Card>
          ) : canReorder ? (
            <SortableList
              items={items}
              onReorder={onReorder}
              className="flex flex-col gap-4"
              renderItem={(item) => renderItem(item, false)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => renderItem(item, true))}
            </div>
          )}
        </div>

        {isEditorOpen && editor}
      </div>
    </Layout>
  );
}
