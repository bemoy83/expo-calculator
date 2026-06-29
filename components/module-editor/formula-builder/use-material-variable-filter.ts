import { useEffect, useMemo, useState } from 'react';
import { Material } from '@/lib/types';
import { MaterialVariableInfo } from './types';

export function useMaterialVariableFilter(
  materials: Material[],
  availableMaterialVariables: MaterialVariableInfo[]
) {
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string | null>(null);

  const materialCategoryByVariable = useMemo(() => {
    return new Map(materials.map((material) => [material.variableName, material.category]));
  }, [materials]);

  const materialCategories = useMemo(() => {
    const categorySet = new Set<string>();
    materials.forEach((material) => {
      const category = material.category?.trim();
      if (category) {
        categorySet.add(category);
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [materials]);

  const materialCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    materials.forEach((material) => {
      const category = material.category?.trim();
      if (!category) return;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return counts;
  }, [materials]);

  const filteredMaterialVariables = useMemo(() => {
    if (!selectedMaterialCategory) return availableMaterialVariables;
    return availableMaterialVariables.filter(
      (materialVar) => materialCategoryByVariable.get(materialVar.name) === selectedMaterialCategory
    );
  }, [availableMaterialVariables, materialCategoryByVariable, selectedMaterialCategory]);

  useEffect(() => {
    if (selectedMaterialCategory && !materialCategories.includes(selectedMaterialCategory)) {
      setSelectedMaterialCategory(null);
    }
  }, [materialCategories, selectedMaterialCategory]);

  return {
    filteredMaterialVariables,
    materialCategories,
    materialCategoryCounts,
    selectedMaterialCategory,
    setSelectedMaterialCategory,
  };
}
