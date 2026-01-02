export type FieldType = 'number' | 'dropdown' | 'text' | 'boolean' | 'material';

export type MaterialPropertyType = 'number' | 'string' | 'boolean' | 'price';

export interface MaterialProperty {
  id: string;
  name: string; // e.g., "length", "width", "density"
  type: MaterialPropertyType;
  value: number | string | boolean; // Legacy - for migration only
  unit?: string; // Legacy display unit (e.g., "ft", "lbs/ft³", "sq ft")
  unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count'; // Auto-inferred from unitSymbol
  unitSymbol?: string; // Normalized symbol (e.g., "mm", "m2", "m3")
  storedValue?: number; // Canonical base-normalized value (always use this for evaluation)
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
  dropdownMode?: 'numeric' | 'string'; // For dropdown type: numeric mode enables unit awareness
  defaultValue?: string | number | boolean;
  unit?: string; // Legacy unit of measurement (e.g., "ft", "sq ft", "hours")
  unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count'; // Auto-inferred from unitSymbol
  unitSymbol?: string; // Normalized symbol (e.g., "mm", "m2", "m3")
  description?: string; // Help text for the field
  materialCategory?: string; // For material type fields: limit materials to this category (empty = all categories)
}

import type { UnitCategory } from './units';
export type { UnitCategory } from './units';

export interface ComputedOutput {
  id: string;
  label: string; // Display name (e.g., "Paint Area")
  variableName: string; // Variable name WITHOUT out. prefix (e.g., "paint_area_m2")
  expression: string; // Formula expression (e.g., "area(width, height)" or "width * height")
  unitSymbol?: string; // Optional unit symbol (e.g., "m2")
  unitCategory?: UnitCategory; // Optional unit category
  description?: string; // Optional help text
}

export interface CalculationModule {
  id: string;
  name: string;
  description?: string;
  category?: string;
  fields: Field[];
  formula: string; // Formula using variable names
  computedOutputs?: ComputedOutput[]; // NEW: Array of computed outputs
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

export interface FieldLink {
  moduleInstanceId: string;
  fieldVariableName: string;
}

export interface SharedFunction {
  id: string;
  name: string; // Function name (e.g., "m2", "area")
  description?: string; // Help text
  formula: string; // Formula using parameter names (e.g., "width * height")
  parameters: Array<{
    name: string; // Parameter name (e.g., "width", "height")
    label: string; // Display label
    unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';
    unitSymbol?: string;
    required?: boolean;
  }>;
  returnUnitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';
  returnUnitSymbol?: string;
  category?: string; // For organization
  createdAt: string;
  updatedAt: string;
}

export interface FunctionOutput {
  functionName: string;
  arguments: Record<string, string>; // Maps parameter name -> field variable name
  instanceId: string; // Module instance that calculates this function
}

export interface FunctionLink {
  sourceInstanceId: string;
  functionName: string;
  outputName?: string; // Optional name for the output
}

export interface QuoteModuleInstance {
  id: string;
  moduleId: string;
  fieldValues: Record<string, string | number | boolean>;
  fieldLinks?: Record<string, FieldLink>; // Maps fieldVariableName -> link target
  functionOutputs?: Record<string, FunctionOutput>; // Maps output name -> function output
  functionInputs?: Record<string, FunctionLink>; // Maps field name -> function link
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

export interface ModuleTemplate {
  id: string;
  name: string;
  description?: string;
  moduleInstances: Array<{
    id?: string; // Instance ID (new format, optional for legacy compatibility)
    moduleId: string;
    fieldValues?: Record<string, string | number | boolean>; // Field values (new format, optional for legacy compatibility)
    fieldLinks?: Record<string, FieldLink>; // Preserved field links
  }>;
  categories: string[]; // Derived from module categories
  // Future-safe fields (not used in MVP but stored for schema evolution)
  moduleVersion?: string; // For future version tracking
  createdFromQuoteId?: string; // For future reference tracking
  createdAt: string;
  updatedAt: string;
}
