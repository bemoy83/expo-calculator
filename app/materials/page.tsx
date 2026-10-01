'use client';

import { useCallback, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useBrowseList } from '@/components/shared/browse/useBrowseList';
import { MaterialEditorPanel } from '@/components/materials/MaterialEditorPanel';
import { MaterialRow } from '@/components/materials/MaterialRow';
import { countCalculatorsUsingCatalogItem } from '@/lib/catalog/catalog-display';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { Material } from '@/lib/types';

const MATERIAL_COLUMNS = [
  { label: 'Variable' },
  { label: 'Properties' },
  { label: 'Price', align: 'right' as const },
  { label: 'Unit', align: 'right' as const },
];
const MATERIAL_GRID = 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.1fr) 7.5rem 4rem';

// The rail lists real categories; the generic "custom" is left out (its items show under All).
const isCustomCategory = (category: string) => category.toLowerCase() === 'custom';
const categoryOf = (item: { category: string }) => item.category;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export default function MaterialsPage() {
  const materials = useMaterialsStore((state) => state.materials);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const updateMaterial = useMaterialsStore((state) => state.updateMaterial);
  const reorderMaterials = useMaterialsStore((state) => state.reorderMaterials);
  const deleteMaterial = useMaterialsStore((state) => state.deleteMaterial);
  const calculators = useCalculatorsStore((state) => state.calculators);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const searchableText = useCallback((material: Material) => [
    material.name,
    material.variableName,
    material.sku,
    material.supplier,
    material.description,
  ], []);

  const catalog = useBrowseList({ items: materials, searchableText, categoryOf, hiddenCategory: isCustomCategory });

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId]
  );

  const openEditor = (material?: Material) => {
    setSelectedMaterialId(material?.id ?? null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedMaterialId(null);
  };

  const handleSave = (
    id: string | null,
    data: Omit<Partial<Material>, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (id) {
      updateMaterial(id, data);
    } else {
      addMaterial(data as Omit<Material, 'id' | 'createdAt' | 'updatedAt'>);
    }
    closeEditor();
  };

  const handleDelete = (id: string) => {
    deleteMaterial(id);
    if (selectedMaterialId === id) {
      closeEditor();
    }
  };

  return (
    <CatalogPageShell
      editorPlaceholder="Choose a material to edit it."
      title="Materials"
      eyebrow={`${plural(materials.length, 'material')} · prices used by every calculator`}
      itemNoun="material"
      addLabel="New material"
      searchPlaceholder="Search name, SKU, variable…"
      emptyTitle="No materials yet"
      emptyFilteredTitle="No materials found"
      emptyDescription="Materials hold the prices your calculators use. Formulas read them by name, so a price change reaches every calculator."
      emptyFilteredDescription="Try adjusting your search or filter criteria."
      emptyIcon={Package}
      items={catalog.listed}
      totalItems={materials.length}
      isEditorOpen={isEditorOpen}
      searchQuery={catalog.search}
      onSearchQueryChange={catalog.setSearch}
      categoryOptions={catalog.railOptions}
      category={catalog.category}
      onCategoryChange={catalog.setCategory}
      canReorder={catalog.canReorder}
      onAdd={() => openEditor()}
      onReorder={(oldIndex, newIndex) =>
        catalog.reorder(oldIndex, newIndex, reorderMaterials)
      }
      columns={MATERIAL_COLUMNS}
      gridTemplate={MATERIAL_GRID}
      renderRow={(material, disableDrag) => (
        <MaterialRow
          key={material.id}
          material={material}
          isSelected={isEditorOpen && material.id === selectedMaterialId}
          disableDrag={disableDrag}
          onOpen={openEditor}
        />
      )}
      editor={
        <MaterialEditorPanel
          material={selectedMaterial}
          materials={materials}
          onSave={handleSave}
          onClose={closeEditor}
          onDelete={handleDelete}
          usageCount={
            selectedMaterial ? countCalculatorsUsingCatalogItem(calculators, selectedMaterial, 'material') : 0
          }
        />
      }
    />
  );
}
