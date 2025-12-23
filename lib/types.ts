export type FieldType = 'number' | 'dropdown' | 'text' | 'boolean' | 'material';

export type MaterialPropertyType = 'number' | 'string' | 'boolean';

export interface MaterialProperty {
  id: string;
  name: string; // e.g., "length", "width", "density"
  type: MaterialPropertyType;
  value: number | string | boolean;
  unit?: string; // e.g., "ft", "lbs/ft³", "sq ft"
}

// Common property names for UI suggestions
export const COMMON_MATERIAL_PROPERTIES = [
  'length',
  'width',
  'height',
  'thickness',
  'density',
  'coverage',
  'weight',
  'volume',
] as const;

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  variableName: string;
  required?: boolean;
  options?: string[]; // For dropdown type
  defaultValue?: string | number | boolean;
  unit?: string; // Unit of measurement (e.g., "ft", "sq ft", "hours")
  description?: string; // Help text for the field
  materialCategory?: string; // For material type fields: limit materials to this category (empty = all categories)
}

export interface CalculationModule {
  id: string;
  name: string;
  description?: string;
  category?: string;
  fields: Field[];
  formula: string; // Formula using variable names
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  variableName: string;
  sku?: string; // Stock Keeping Unit
  supplier?: string; // Supplier name
  description?: string; // Material description or usage notes
  properties?: MaterialProperty[]; // Material properties (dimensions, density, etc.)
  createdAt: string;
  updatedAt: string;
}

export interface QuoteModuleInstance {
  id: string;
  moduleId: string;
  fieldValues: Record<string, string | number | boolean>;
  calculatedCost: number;
}

/**
 * A committed line item in the quote (added via "Add to Quote")
 * This represents a snapshot of a module configuration at the time it was added
 */
export interface QuoteLineItem {
  id: string;
  moduleId: string;
  moduleName: string;
  fieldValues: Record<string, string | number | boolean>;
  fieldSummary: string; // Brief summary of key input values
  cost: number;
  createdAt: string;
}

export interface Quote {
  id: string;
  name: string;
  // Workspace modules - editable, not included in totals
  workspaceModules: QuoteModuleInstance[];
  // Committed line items - included in totals
  lineItems: QuoteLineItem[];
  subtotal: number;
  markupPercent: number; // Business markup percentage (e.g., 12.5 for 12.5%)
  markupAmount: number; // Calculated markup amount
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

