'use client';

import { useCallback, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { LaborEditorPanel } from '@/components/labor/LaborEditorPanel';
import { LaborRow } from '@/components/labor/LaborRow';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useBrowseList } from '@/components/shared/browse/useBrowseList';
import { countCalculatorsUsingCatalogItem } from '@/lib/catalog/catalog-display';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { Labor } from '@/lib/types';

const LABOR_COLUMNS = [
  { label: 'Variable' },
  { label: 'Properties' },
  { label: 'Rate', align: 'right' as const },
];
const LABOR_GRID = 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.3fr) 9rem';

// The rail lists real categories; the generic "custom" is left out (its items show under All).
const isCustomCategory = (category: string) => category.toLowerCase() === 'custom';
const categoryOf = (item: { category: string }) => item.category;

export default function LaborPage() {
  const labor = useLaborStore((state) => state.labor);
  const addLabor = useLaborStore((state) => state.addLabor);
  const updateLabor = useLaborStore((state) => state.updateLabor);
  const reorderLabor = useLaborStore((state) => state.reorderLabor);
  const deleteLabor = useLaborStore((state) => state.deleteLabor);
  const calculators = useCalculatorsStore((state) => state.calculators);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedLaborId, setSelectedLaborId] = useState<string | null>(null);

  const searchableText = useCallback((laborItem: Labor) => [
    laborItem.name,
    laborItem.variableName,
    laborItem.description,
  ], []);

  const catalog = useBrowseList({ items: labor, searchableText, categoryOf, hiddenCategory: isCustomCategory });

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
      tab="labor"
      editorPlaceholder="Choose a labor item to edit it, or add one with + New labor."
      title="Labor"
      addLabel="New labor"
      searchPlaceholder="Search name, variable…"
      firstItemLabel="Add your first labor item"
      emptyTitle="No labor items yet"
      emptyFilteredTitle="No labor items found"
      emptyDescription="Add your first labor item to start building your catalog."
      emptyFilteredDescription="Try adjusting your search or filter criteria."
      emptyIcon={Users}
      items={catalog.listed}
      totalItems={labor.length}
      isEditorOpen={isEditorOpen}
      searchQuery={catalog.search}
      onSearchQueryChange={catalog.setSearch}
      categoryOptions={catalog.railOptions}
      category={catalog.category}
      onCategoryChange={catalog.setCategory}
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
            selectedLabor ? countCalculatorsUsingCatalogItem(calculators, selectedLabor, 'labor') : 0
          }
        />
      }
    />
  );
}
