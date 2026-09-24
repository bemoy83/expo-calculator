'use client';

import { useCallback, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { LaborEditorPanel } from '@/components/labor/LaborEditorPanel';
import { LaborRow } from '@/components/labor/LaborRow';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useCatalogListState } from '@/components/shared/catalog/useCatalogListState';
import { countModulesUsingCatalogItem } from '@/lib/catalog/catalog-display';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { Labor } from '@/lib/types';

const LABOR_COLUMNS = [
  { label: 'Variable' },
  { label: 'Properties' },
  { label: 'Rate', align: 'right' as const },
];
const LABOR_GRID = 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.3fr) 9rem';

export default function LaborPage() {
  const labor = useLaborStore((state) => state.labor);
  const addLabor = useLaborStore((state) => state.addLabor);
  const updateLabor = useLaborStore((state) => state.updateLabor);
  const reorderLabor = useLaborStore((state) => state.reorderLabor);
  const deleteLabor = useLaborStore((state) => state.deleteLabor);
  const modules = useModulesStore((state) => state.modules);

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
    if (selectedLaborId === id) {
      closeEditor();
    }
  };

  return (
    <CatalogPageShell
      title="Labor"
      addLabel="New labor"
      searchPlaceholder="Search name, variable…"
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
      categoryCounts={catalog.categoryCounts}
      categoryFilter={catalog.categoryFilter}
      onCategoryFilterChange={catalog.setCategoryFilter}
      canReorder={catalog.canReorder}
      onAdd={() => openEditor()}
      onReorder={(oldIndex, newIndex) =>
        catalog.reorder(oldIndex, newIndex, reorderLabor)
      }
      columns={LABOR_COLUMNS}
      gridTemplate={LABOR_GRID}
      renderRow={(laborItem, disableDrag) => (
        <LaborRow
          key={laborItem.id}
          laborItem={laborItem}
          isSelected={isEditorOpen && laborItem.id === selectedLaborId}
          disableDrag={disableDrag}
          onOpen={openEditor}
        />
      )}
      editor={
        <LaborEditorPanel
          laborItem={selectedLabor}
          labor={labor}
          onSave={handleSave}
          onClose={closeEditor}
          onDelete={handleDelete}
          usageCount={
            selectedLabor ? countModulesUsingCatalogItem(modules, selectedLabor, 'labor') : 0
          }
        />
      }
    />
  );
}
