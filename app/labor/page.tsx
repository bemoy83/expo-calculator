'use client';

import { useCallback, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { LaborEditorPanel } from '@/components/labor/LaborEditorPanel';
import { LaborItem } from '@/components/labor/LaborItem';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useCatalogListState } from '@/components/shared/catalog/useCatalogListState';
import { useLaborStore } from '@/lib/stores/labor-store';
import { Labor } from '@/lib/types';

export default function LaborPage() {
  const labor = useLaborStore((state) => state.labor);
  const addLabor = useLaborStore((state) => state.addLabor);
  const updateLabor = useLaborStore((state) => state.updateLabor);
  const deleteLabor = useLaborStore((state) => state.deleteLabor);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedLaborId, setSelectedLaborId] = useState<string | null>(null);

  const searchableText = useCallback((laborItem: Labor) => [
    laborItem.name,
    laborItem.variableName,
    laborItem.description,
  ], []);

  const catalog = useCatalogListState({ items: labor, searchableText });

  const selectedLabor = useMemo(
    () => labor.find((laborItem) => laborItem.id === selectedLaborId) ?? null,
    [labor, selectedLaborId]
  );

  const openEditor = (laborItem?: Labor) => {
    setSelectedLaborId(laborItem?.id ?? null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedLaborId(null);
  };

  const handleSave = (
    id: string | null,
    data: Omit<Partial<Labor>, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (id) {
      updateLabor(id, data);
    } else {
      addLabor(data as Omit<Labor, 'id' | 'createdAt' | 'updatedAt'>);
    }
    closeEditor();
  };

  const handleDelete = (id: string) => {
    deleteLabor(id);
    catalog.removeCollapsedId(id);
    if (selectedLaborId === id) {
      closeEditor();
    }
  };

  return (
    <CatalogPageShell
      title="Labor Catalog"
      description="Manage labor rates and productivity rates for use in calculation formulas"
      addLabel="Add Labor"
      firstItemLabel="Add Your First Labor Item"
      emptyTitle="No Labor Items Yet"
      emptyFilteredTitle="No Labor Items Found"
      emptyDescription="Add your first labor item to start building your catalog."
      emptyFilteredDescription="Try adjusting your search or filter criteria."
      emptyIcon={Users}
      items={catalog.filteredItems}
      totalItems={labor.length}
      isEditorOpen={isEditorOpen}
      searchQuery={catalog.searchQuery}
      onSearchQueryChange={catalog.setSearchQuery}
      categories={catalog.categories}
      categoryFilter={catalog.categoryFilter}
      onCategoryFilterChange={catalog.setCategoryFilter}
      canReorder={catalog.canReorder}
      onAdd={() => openEditor()}
      onReorder={(oldIndex, newIndex) =>
        catalog.reorder(oldIndex, newIndex, (id, order) => updateLabor(id, { order }))
      }
      renderItem={(laborItem, disableDrag) => (
        <LaborItem
          key={laborItem.id}
          labor={laborItem}
          isCollapsed={catalog.collapsedIds.has(laborItem.id)}
          onToggleCollapse={catalog.toggleCollapse}
          onEdit={openEditor}
          onDelete={handleDelete}
          disableDrag={disableDrag}
        />
      )}
      editor={
        <LaborEditorPanel
          laborItem={selectedLabor}
          labor={labor}
          onSave={handleSave}
          onClose={closeEditor}
        />
      }
    />
  );
}
