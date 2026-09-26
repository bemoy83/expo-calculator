import type { LaborProperty, Material, MaterialProperty } from '../types';
import { convertFromBase, getUnitCategory, normalizeToBase } from '../units';

// A price property is an amount per unit ("10 per m²", "4200 per pallet"). Stored values are
// in base units like every number, which for a price means per base unit: a price per mm is
// 1000 times the price per m. So prices convert the opposite way to measurements. Units the
// registry doesn't know (sheet, bucket, pallet) are labels and don't convert.

/** A price per `unitSymbol` as a price per base unit. */
export function priceToBase(amount: number, unitSymbol?: string): number {
  if (!unitSymbol) return amount;
  return amount / normalizeToBase(1, unitSymbol);
}

/** A price per base unit as a price per `unitSymbol`. */
export function priceFromBase(stored: number, unitSymbol?: string): number {
  if (!unitSymbol) return stored;
  return stored * normalizeToBase(1, unitSymbol);
}

/** Stored value and unit category for a number or price property as typed. */
export function normalizePropertyValue(
  value: number,
  type: MaterialProperty['type'] | LaborProperty['type'],
  unitSymbol?: string
): Pick<MaterialProperty, 'storedValue' | 'unitCategory'> {
  if (!unitSymbol) return { storedValue: value };
  return {
    storedValue: type === 'price' ? priceToBase(value, unitSymbol) : normalizeToBase(value, unitSymbol),
    unitCategory: getUnitCategory(unitSymbol),
  };
}

/** A property's stored value back in its own unit, as typed. */
export function propertyValueInUnit(property: MaterialProperty | LaborProperty): number | undefined {
  if (property.storedValue === undefined || !property.unitSymbol) {
    return typeof property.value === 'number' ? property.value : undefined;
  }
  return property.type === 'price'
    ? priceFromBase(property.storedValue, property.unitSymbol)
    : convertFromBase(property.storedValue, property.unitSymbol);
}

/**
 * Price properties saved before prices converted the right way stored a price per mm like a
 * length (divided by 1000). Recomputes their stored value from the amount as typed.
 */
export function fixPricePropertyStorage(material: Material): Material {
  if (!material.properties?.some((property) => property.type === 'price' && property.unitSymbol)) return material;
  return {
    ...material,
    properties: material.properties.map((property) =>
      property.type === 'price' && property.unitSymbol && typeof property.value === 'number'
        ? { ...property, ...normalizePropertyValue(property.value, 'price', property.unitSymbol) }
        : property
    ),
  };
}

/** Price properties of a material: its prices besides the default one. */
export function otherPrices(material: Pick<Material, 'properties'>): MaterialProperty[] {
  return (material.properties ?? []).filter((property) => property.type === 'price');
}
