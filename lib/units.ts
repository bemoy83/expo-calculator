/**
 * Unit System Module
 * 
 * Defines unit categories, base units, conversions, and compatibility checking
 * for the estimator's unit-aware formula evaluation system.
 */

export type UnitCategory = 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';

export interface Unit {
  category: UnitCategory;
  symbol: string;
  toBase(value: number): number; // Convert input to base unit
  fromBase(value: number): number; // Convert base to display unit
}

/**
 * Unit registry with conversion functions
 */
export const UNITS: Record<string, Unit> = {
  // Length units (base: meters)
  mm: {
    category: 'length',
    symbol: 'mm',
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  cm: {
    category: 'length',
    symbol: 'cm',
    toBase: (v) => v / 100,
    fromBase: (v) => v * 100,
  },
  m: {
    category: 'length',
    symbol: 'm',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  
  // Area units (base: square meters)
  m2: {
    category: 'area',
    symbol: 'm²',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  
  // Volume units (base: cubic meters)
  m3: {
    category: 'volume',
    symbol: 'm³',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  l: {
    category: 'volume',
    symbol: 'L',
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  
  // Weight units (base: kg)
  kg: {
    category: 'weight',
    symbol: 'kg',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  
  // Percentage (base: numeric 0-100)
  '%': {
    category: 'percentage',
    symbol: '%',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  
  // Count (unitless)
  pcs: {
    category: 'count',
    symbol: 'pcs',
    toBase: (v) => v,      // No conversion needed
    fromBase: (v) => v,    // No conversion needed
  },
  // Liters as count unit (for counting containers, not volume calculations)
  // When used as count, "3 liters" means "3" - no conversion to m³
  liters: {
    category: 'count',
    symbol: 'L',
    toBase: (v) => v,      // No conversion - use as-is
    fromBase: (v) => v,    // No conversion - use as-is
  },
  // When used as count, 30$ means "30" - no conversion to $
  price: {
    category: 'count',
    symbol: '$',
    toBase: (v) => v,      // No conversion - use as-is
    fromBase: (v) => v,    // No conversion - use as-is
  },
};

/**
 * Get unit by symbol
 */
export function getUnit(symbol: string): Unit | undefined {
  return UNITS[symbol];
}

/**
 * Get unit category from symbol (auto-infer)
 */
export function getUnitCategory(symbol: string): UnitCategory | undefined {
  const unit = getUnit(symbol);
  return unit?.category;
}

/**
 * Convert value from one unit to another
 */
export function convert(value: number, fromUnitSymbol: string, toUnitSymbol: string): number {
  const fromUnit = getUnit(fromUnitSymbol);
  const toUnit = getUnit(toUnitSymbol);
  
  if (!fromUnit || !toUnit) {
    throw new Error(`Invalid unit symbols: ${fromUnitSymbol} or ${toUnitSymbol}`);
  }
  
  if (fromUnit.category !== toUnit.category) {
    throw new Error(`Cannot convert between different unit categories: ${fromUnit.category} and ${toUnit.category}`);
  }
  
  // Convert to base, then to target
  const baseValue = fromUnit.toBase(value);
  return toUnit.fromBase(baseValue);
}

/**
 * Check if two units are compatible (same category)
 */
export function areCompatible(unit1Symbol: string, unit2Symbol: string): boolean {
  const unit1 = getUnit(unit1Symbol);
  const unit2 = getUnit(unit2Symbol);
  
  if (!unit1 || !unit2) {
    return false;
  }
  
  return unit1.category === unit2.category;
}

/**
 * Multiply two unit categories and return the result category
 * 
 * Rules:
 * - length * length → area
 * - area * length → volume
 * - length * area → volume
 * - unitless acts as scalar (returns the other category)
 * - cross-category → unitless (count)
 */
export function multiplyUnits(cat1: UnitCategory, cat2: UnitCategory): UnitCategory | null {
  // Same dimension promotion
  if (cat1 === 'length' && cat2 === 'length') return 'area';
  if (cat1 === 'area' && cat2 === 'length') return 'volume';
  if (cat1 === 'length' && cat2 === 'area') return 'volume';
  
  // Unitless acts as scalar
  if (cat1 === 'count' || cat1 === 'percentage') return cat2;
  if (cat2 === 'count' || cat2 === 'percentage') return cat1;
  
  // Cross-category → unitless
  return 'count';
}

/**
 * Divide two unit categories and return the result category
 * 
 * Rules:
 * - Same dimension ÷ same dimension → unitless (count)
 * - Unit ÷ unitless → keep original unit
 * - Unitless ÷ unit → disallow (return null)
 * - Different dimensional units → disallow (return null)
 */
export function divideUnits(cat1: UnitCategory, cat2: UnitCategory): UnitCategory | null {
  // Same dimension ÷ same dimension → unitless
  if (cat1 === cat2 && cat1 !== 'count' && cat1 !== 'percentage') {
    return 'count'; // unitless
  }
  
  // Unit ÷ unitless → keep original unit
  if (cat2 === 'count' || cat2 === 'percentage') {
    return cat1;
  }
  
  // Unitless ÷ unit → disallow
  if (cat1 === 'count' || cat1 === 'percentage') {
    return null; // Error
  }
  
  // Different dimensional units → disallow
  return null; // Error
}

/**
 * Get all available unit symbols for a given category
 */
export function getUnitsByCategory(category: UnitCategory): string[] {
  return Object.entries(UNITS)
    .filter(([_, unit]) => unit.category === category)
    .map(([symbol]) => symbol);
}

/**
 * Get all available unit symbols
 */
export function getAllUnitSymbols(): string[] {
  return Object.keys(UNITS);
}

/**
 * Normalize a value to base unit given a unit symbol
 */
export function normalizeToBase(value: number, unitSymbol: string): number {
  const unit = getUnit(unitSymbol);
  if (!unit) {
    // If unit not found, treat as unitless (no conversion)
    return value;
  }
  return unit.toBase(value);
}

/**
 * Convert a base-normalized value to display unit
 */
export function convertFromBase(value: number, unitSymbol: string): number {
  const unit = getUnit(unitSymbol);
  if (!unit) {
    // If unit not found, treat as unitless (no conversion)
    return value;
  }
  return unit.fromBase(value);
}

