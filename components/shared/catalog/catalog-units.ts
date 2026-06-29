import { getUnitCategory, normalizeToBase } from '@/lib/units';
import { LaborProperty, MaterialProperty } from '@/lib/types';

export function normalizeNumericProperty(
  value: number,
  unitSymbol?: string
): Pick<MaterialProperty | LaborProperty, 'storedValue' | 'unitCategory'> {
  if (!unitSymbol) {
    return { storedValue: value };
  }

  return {
    storedValue: normalizeToBase(value, unitSymbol),
    unitCategory: getUnitCategory(unitSymbol),
  };
}

export function applyNumericPropertyNormalization<T extends Partial<MaterialProperty | LaborProperty>>(
  property: T
): T {
  if (typeof property.value !== 'number') {
    return property;
  }

  const normalized = normalizeNumericProperty(property.value, property.unitSymbol);
  return {
    ...property,
    ...normalized,
  };
}
