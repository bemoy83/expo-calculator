import type { Calculator } from '../calculator/types';
import type { LaborProperty, MaterialProperty } from '../types';
import { propertyValueInUnit } from './prices';
import { NAME_CHAR } from '../formula/identifiers';

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

// Calculators that use a catalog item, either:
// - by name: a step's formula references its variable, bare (`mdf18`) or through a property
//   (`mdf18.thickness`); or
// - through a picker: a material (or labor) input whose category is the item's category, or
//   empty (any category), so the item can be picked there.
export function countCalculatorsUsingCatalogItem(
  calculators: Calculator[],
  item: { variableName: string; category: string },
  kind: 'material' | 'labor'
): number {
  const { variableName, category } = item;
  const references = (expression: string) =>
    !!variableName &&
    (expression.match(new RegExp(`[${NAME_CHAR}.]+`, 'g')) ?? []).some(
      (token) => token === variableName || token.startsWith(`${variableName}.`)
    );
  return calculators.filter(
    (calculator) =>
      calculator.steps.some((step) => step.source.type === 'expression' && references(step.source.expression)) ||
      calculator.inputs.some((input) => {
        if (input.value.kind !== kind) return false;
        const filter = input.value.category?.trim();
        return !filter || filter === category;
      })
  ).length;
}

export function countByCategory(items: Array<{ category: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return counts;
}
