import type { CalculationModule, LaborProperty, MaterialProperty } from '../types';
import { propertyValueInUnit } from './prices';

// Strips float noise from unit conversion (0.018 m → 18.000000000000004 mm).
function cleanNumber(value: number): number {
  return Number(value.toPrecision(12));
}

// A property's value as the user entered it: converted back from its base unit, with the unit.
export function formatCatalogPropertyValue(prop: MaterialProperty | LaborProperty): string {
  if (prop.type === 'boolean') {
    return prop.value === true || prop.value === 'true' ? 'True' : 'False';
  }
  const isNumeric = prop.type === 'number' || prop.type === 'price';
  if (isNumeric && prop.unitSymbol && prop.storedValue !== undefined) {
    const shown = cleanNumber(propertyValueInUnit(prop) ?? 0);
    return prop.type === 'price' ? `${shown} per ${prop.unitSymbol}` : `${shown} ${prop.unitSymbol}`;
  }
  const legacyUnit = 'unit' in prop ? prop.unit : undefined;
  const unit = prop.unitSymbol || legacyUnit;
  const value = typeof prop.value === 'number' ? cleanNumber(prop.value) : String(prop.value);
  return unit ? `${value} ${unit}` : String(value);
}

// Modules that use a catalog item, either:
// - by name: the formula or a computed output references its variable, bare (`mdf18`, the
//   price or rate) or through a property (`mdf18.thickness`); or
// - through a picker: a material (or labor) field whose category filter is the item's
//   category, or empty (any category), so the item can be chosen for that field in a quote.
export function countModulesUsingCatalogItem(
  modules: CalculationModule[],
  item: { variableName: string; category: string },
  kind: 'material' | 'labor'
): number {
  const { variableName, category } = item;
  const references = (expression: string | undefined) =>
    !!variableName &&
    (expression?.match(/[A-Za-z0-9_.]+/g) ?? []).some(
      (token) => token === variableName || token.startsWith(`${variableName}.`)
    );
  const offersInPicker = (module: CalculationModule) =>
    (module.fields ?? []).some((field) => {
      if (field.type !== kind) return false;
      const filter = (kind === 'material' ? field.materialCategory : field.laborCategory)?.trim();
      return !filter || filter === category;
    });
  return modules.filter(
    (module) =>
      references(module.formula) ||
      (module.computedOutputs ?? []).some((output) => references(output.expression)) ||
      offersInPicker(module)
  ).length;
}

export function countByCategory(items: Array<{ category: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return counts;
}
