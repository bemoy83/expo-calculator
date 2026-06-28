import { Labor, Material } from '../types';

export interface CatalogIndex {
  materialsByVariableName: Map<string, Material>;
  laborByVariableName: Map<string, Labor>;
  materialsByCategory: Map<string, Material[]>;
  laborByCategory: Map<string, Labor[]>;
}

function groupSortedByCategory<T extends { category: string; name: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const category = item.category.trim();
    if (!category) continue;
    grouped.set(category, [...(grouped.get(category) ?? []), item]);
  }

  for (const [category, values] of grouped) {
    grouped.set(category, [...values].sort((a, b) => a.name.localeCompare(b.name)));
  }

  return grouped;
}

export function createCatalogIndex(materials: Material[], labor: Labor[] = []): CatalogIndex {
  return {
    materialsByVariableName: new Map(materials.map((material) => [material.variableName, material])),
    laborByVariableName: new Map(labor.map((laborItem) => [laborItem.variableName, laborItem])),
    materialsByCategory: groupSortedByCategory(materials),
    laborByCategory: groupSortedByCategory(labor),
  };
}

export function getSortedMaterialsForCategory(index: CatalogIndex, category?: string): Material[] {
  if (category?.trim()) {
    return index.materialsByCategory.get(category) ?? [];
  }
  return [...index.materialsByVariableName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getSortedLaborForCategory(index: CatalogIndex, category?: string): Labor[] {
  if (category?.trim()) {
    return index.laborByCategory.get(category) ?? [];
  }
  return [...index.laborByVariableName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
