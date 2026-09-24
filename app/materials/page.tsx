'use client';

import { useCallback, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useCatalogListState } from '@/components/shared/catalog/useCatalogListState';
import { MaterialEditorPanel } from '@/components/materials/MaterialEditorPanel';
import { MaterialRow } from '@/components/materials/MaterialRow';
import { countModulesUsingCatalogItem } from '@/lib/catalog/catalog-display';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { Material } from '@/lib/types';

const MATERIAL_COLUMNS = [
  { label: 'Variable' },
  { label: 'Properties' },
  { label: 'Price', align: 'right' as const },
  { label: 'Unit', align: 'right' as const },
];
const MATERIAL_GRID = 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.1fr) 7.5rem 4rem';

export default function MaterialsPage() {
  const materials = useMaterialsStore((state) => state.materials);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const updateMaterial = useMaterialsStore((state) => state.updateMaterial);
  const reorderMaterials = useMaterialsStore((state) => state.reorderMaterials);
  const deleteMaterial = useMaterialsStore((state) => state.deleteMaterial);
  const modules = useModulesStore((state) => state.modules);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const searchableText = useCallback((material: Material) => [
    material.name,
    material.variableName,
    material.sku,
    material.supplier,
    material.description,
  ], []);

  const catalog = useCatalogListState({ items: materials, searchableText });

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
      title="Materials"
      addLabel="New material"
      searchPlaceholder="Search name, SKU, variable…"
      firstItemLabel="Add Your First Material"
      emptyTitle="No Materials Yet"
      emptyFilteredTitle="No Materials Found"
      emptyDescription="Add your first material to start building your catalog."
      emptyFilteredDescription="Try adjusting your search or filter criteria."
      emptyIcon={Package}
      items={catalog.filteredItems}
      totalItems={materials.length}
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
            selectedMaterial ? countModulesUsingCatalogItem(modules, selectedMaterial, 'material') : 0
          }
        />
      }
    />
  );
}
