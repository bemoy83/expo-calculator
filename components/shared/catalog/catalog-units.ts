import { normalizePropertyValue } from '@/lib/catalog/prices';
import { LaborProperty, MaterialProperty } from '@/lib/types';

// Stored value for a number or price property as typed. Prices convert the opposite way to
// measurements (a price per mm is 1000 × the price per m); see lib/catalog/prices.ts.
export function normalizeNumericProperty(
  value: number,
  unitSymbol?: string,
  type: MaterialProperty['type'] | LaborProperty['type'] = 'number'
): Pick<MaterialProperty | LaborProperty, 'storedValue' | 'unitCategory'> {
  return normalizePropertyValue(value, type, unitSymbol);
}

export function applyNumericPropertyNormalization<T extends Partial<MaterialProperty | LaborProperty>>(
  property: T
): T {
  if (typeof property.value !== 'number') {
    return property;
  }

  const normalized = normalizeNumericProperty(property.value, property.unitSymbol, property.type);
  return {
    ...property,
    ...normalized,
  };
}
