'use client';

import { useCallback, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { CatalogPageShell } from '@/components/shared/catalog/CatalogPageShell';
import { useCatalogListState } from '@/components/shared/catalog/useCatalogListState';
import { MaterialEditorPanel } from '@/components/materials/MaterialEditorPanel';
import { MaterialItem } from '@/components/materials/MaterialItem';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Material } from '@/lib/types';

export default function MaterialsPage() {
  const materials = useMaterialsStore((state) => state.materials);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const updateMaterial = useMaterialsStore((state) => state.updateMaterial);
  const deleteMaterial = useMaterialsStore((state) => state.deleteMaterial);

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
    catalog.removeCollapsedId(id);
    if (selectedMaterialId === id) {
      closeEditor();
    }
  };

  return (
    <CatalogPageShell
      title="Materials Catalog"
      description="Manage materials and their prices for use in calculation formulas"
      addLabel="Add Material"
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
      categoryFilter={catalog.categoryFilter}
      onCategoryFilterChange={catalog.setCategoryFilter}
      canReorder={catalog.canReorder}
      onAdd={() => openEditor()}
      onReorder={(oldIndex, newIndex) =>
        catalog.reorder(oldIndex, newIndex, (id, order) => updateMaterial(id, { order }))
      }
      renderItem={(material, disableDrag) => (
        <MaterialItem
          key={material.id}
          material={material}
          isCollapsed={catalog.collapsedIds.has(material.id)}
          onToggleCollapse={catalog.toggleCollapse}
          onEdit={openEditor}
          onDelete={handleDelete}
          disableDrag={disableDrag}
        />
      )}
      editor={
        <MaterialEditorPanel
          material={selectedMaterial}
          materials={materials}
          onSave={handleSave}
          onClose={closeEditor}
        />
      }
    />
  );
}
