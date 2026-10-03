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
const UNITS: Record<string, Unit> = {
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
  // Hours as count unit (for counting hours, not time calculations)
  hr: {
    category: 'count',
    symbol: 'hr',
    toBase: (v) => v,      // No conversion - use as-is
    fromBase: (v) => v,    // No conversion - use as-is
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
