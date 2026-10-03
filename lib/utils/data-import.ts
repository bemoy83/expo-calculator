import type { Calculator } from '../calculator/types';
import { Material, SharedFunction, Labor } from '../types';
import { useCalculatorsStore } from '../stores/calculators-store';
import { useMaterialsStore } from '../stores/materials-store';
import { fixPricePropertyStorage } from '../catalog/prices';
import { useCategoriesStore } from '../stores/categories-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useDeviceStore } from '../stores/device-store';
import type { ExportedData } from './data-export';

export interface ImportOptions {
  mode: 'replace' | 'merge';
}

export interface ImportResult {
  success: boolean;
  calculatorsAdded: number;
  materialsAdded: number;
  laborAdded: number;
  categoriesAdded: number;
  functionsAdded: number;
  errors?: string[];
  /** Things the user should know that didn't stop the import. */
  warnings?: string[];
}

/** Whether the file carries calculators at all. */
function hasCalculators(data: ExportedData): boolean {
  return data.calculators !== undefined;
}

/** A file from before 2.0.0: it has modules or templates, which calculators replaced, and no calculators. */
function isFromBeforeCalculators(data: ExportedData): boolean {
  const old = data as unknown as Record<string, unknown>;
  return data.calculators === undefined && (old.modules !== undefined || old.templates !== undefined);
}

function isCalculator(value: unknown): value is Calculator {
  const calculator = value as Calculator;
  return (
    !!calculator &&
    typeof calculator === 'object' &&
    typeof calculator.id === 'string' &&
    typeof calculator.name === 'string' &&
    Array.isArray(calculator.inputs) &&
    Array.isArray(calculator.parts) &&
    Array.isArray(calculator.steps) &&
    Array.isArray(calculator.layout)
  );
}

/**
 * Validate imported data structure
 */
export function validateImportedData(json: unknown): json is ExportedData {
  if (!json || typeof json !== 'object') {
    return false;
  }

  const data = json as Record<string, unknown>;

  // Required top-level keys. Calculators (2.0.0 and later) are optional.
  if (
    typeof data.version !== 'string' ||
    typeof data.exportedAt !== 'string' ||
    !Array.isArray(data.materials) ||
    !Array.isArray(data.customCategories)
  ) {
    return false;
  }

  // A pack replaces calculators, functions and catalogs, so it must carry all of them.
  if (data.kind !== undefined) {
    if (data.kind !== 'pack') return false;
    if (!Array.isArray(data.calculators) || !Array.isArray(data.functions) || !Array.isArray(data.labor)) return false;
  }

  if (data.calculators !== undefined) {
    if (!Array.isArray(data.calculators) || !data.calculators.every(isCalculator)) return false;
  }

  // Validate materials structure
  for (const material of data.materials) {
    if (
      typeof material !== 'object' ||
      typeof (material as Material).id !== 'string' ||
      typeof (material as Material).name !== 'string' ||
      typeof (material as Material).variableName !== 'string' ||
      typeof (material as Material).price !== 'number'
    ) {
      return false;
    }
  }

  // Validate labor structure (if present)
  if (data.labor !== undefined) {
    if (!Array.isArray(data.labor)) {
      return false;
    }
    for (const laborItem of data.labor) {
      if (
        typeof laborItem !== 'object' ||
        typeof (laborItem as Labor).id !== 'string' ||
        typeof (laborItem as Labor).name !== 'string' ||
        typeof (laborItem as Labor).variableName !== 'string' ||
        typeof (laborItem as Labor).cost !== 'number'
      ) {
        return false;
      }
    }
  }

  // Validate categories (should be strings)
  for (const category of data.customCategories) {
    if (typeof category !== 'string') {
      return false;
    }
  }

  // Validate functions structure (if present)
  if (data.functions !== undefined) {
    if (!Array.isArray(data.functions)) {
      return false;
    }
    for (const func of data.functions) {
      if (
        typeof func !== 'object' ||
        typeof (func as SharedFunction).id !== 'string' ||
        typeof (func as SharedFunction).name !== 'string' ||
        typeof (func as SharedFunction).formula !== 'string' ||
        !Array.isArray((func as SharedFunction).parameters)
      ) {
        return false;
      }
      // displayName is optional for backward compatibility
      if ((func as SharedFunction).displayName !== undefined && typeof (func as SharedFunction).displayName !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Import data with replace or merge mode.
 *
 * Replace deletes each kind of data the file contains, then imports it; kinds a file doesn't
 * contain (labor or functions in old files) are left as they are. Calculators keep their ids,
 * so quote lines sent from them still find them. Merge adds what's new and skips anything
 * whose id, name or variable name is taken. Quotes are never touched.
 *
 * A calculator pack is imported with replace (it carries every kind it replaces), and the
 * browser remembers it as the loaded pack; replacing calculators from any other file forgets
 * that, since the calculators no longer come from the pack.
 */
export function importData(data: ExportedData, options: ImportOptions): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let calculatorsAdded = 0;
  let materialsAdded = 0;
  let laborAdded = 0;
  let categoriesAdded = 0;
  let functionsAdded = 0;
  const isReplace = options.mode === 'replace';

  const addMaterial = (material: Material) => {
    try {
      useMaterialsStore.getState().addMaterial({
        name: material.name,
        category: material.category,
        unit: material.unit,
        price: material.price,
        variableName: material.variableName,
        sku: material.sku,
        supplier: material.supplier,
        description: material.description,
        properties: fixPricePropertyStorage(material).properties,
      });
      materialsAdded++;
    } catch (err) {
      errors.push(`Failed to import material "${material.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  const addLabor = (laborItem: Labor) => {
    try {
      useLaborStore.getState().addLabor({
        name: laborItem.name,
        category: laborItem.category,
        cost: laborItem.cost,
        variableName: laborItem.variableName,
        description: laborItem.description,
        properties: laborItem.properties,
      });
      laborAdded++;
    } catch (err) {
      errors.push(`Failed to import labor "${laborItem.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  const addFunction = (func: SharedFunction) => {
    try {
      useFunctionsStore.getState().addFunction({
        displayName: func.displayName || func.name, // Older files may have no displayName
        name: func.name,
        description: func.description,
        formula: func.formula,
        parameters: func.parameters,
        returnUnitCategory: func.returnUnitCategory,
        returnUnitSymbol: func.returnUnitSymbol,
        category: func.category,
      });
      functionsAdded++;
    } catch (err) {
      errors.push(`Failed to import function "${func.displayName || func.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  try {
    const incomingCalculators = data.calculators ?? [];

    if (isReplace) {
      useMaterialsStore.setState({ materials: [] });
      useCategoriesStore.setState({ customCategories: [] });
      if (data.labor !== undefined) useLaborStore.setState({ labor: [] });
      if (data.functions !== undefined) useFunctionsStore.setState({ functions: [] });
      if (hasCalculators(data)) useCalculatorsStore.setState({ calculators: [] });
    }

    // Materials, labor and functions: merge skips a variable name (or call name) already taken.
    const materialNames = new Set(useMaterialsStore.getState().materials.map((m) => m.variableName));
    data.materials.forEach((material) => {
      if (isReplace || !materialNames.has(material.variableName)) addMaterial(material as Material);
    });

    const laborNames = new Set(useLaborStore.getState().labor.map((l) => l.variableName));
    (data.labor ?? []).forEach((laborItem) => {
      if (isReplace || !laborNames.has(laborItem.variableName)) addLabor(laborItem);
    });

    const existingCategories = new Set(useCategoriesStore.getState().customCategories);
    data.customCategories.forEach((category) => {
      if (existingCategories.has(category)) return;
      try {
        useCategoriesStore.getState().addCategory(category);
        categoriesAdded++;
      } catch (err) {
        errors.push(`Failed to import category "${category}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    const functionNames = new Set(useFunctionsStore.getState().functions.map((f) => f.name.toLowerCase()));
    (data.functions ?? []).forEach((func) => {
      if (isReplace || !functionNames.has(func.name.toLowerCase())) addFunction(func);
    });

    // Calculators keep their ids. Merge skips one whose id or name is already here.
    const existing = useCalculatorsStore.getState().calculators;
    const ids = new Set(existing.map((calculator) => calculator.id));
    const names = new Set(existing.map((calculator) => calculator.name.toLowerCase()));
    const added: Calculator[] = [];
    for (const calculator of incomingCalculators) {
      if (ids.has(calculator.id) || (!isReplace && names.has(calculator.name.toLowerCase()))) continue;
      ids.add(calculator.id);
      names.add(calculator.name.toLowerCase());
      added.push(calculator);
    }
    useCalculatorsStore.setState({ calculators: [...useCalculatorsStore.getState().calculators, ...added] });
    calculatorsAdded = added.length;

    if (isFromBeforeCalculators(data)) {
      warnings.push('This file is from before calculators: its modules and templates can no longer be imported, so only its materials, labor, functions and categories were.');
    }
    if (isReplace && hasCalculators(data)) {
      useDeviceStore.getState().setLoadedPack(
        data.kind === 'pack'
          ? { exportedAt: data.exportedAt, loadedAt: new Date().toISOString(), calculatorCount: calculatorsAdded }
          : undefined
      );
    }
    if (isReplace && !hasCalculators(data)) {
      warnings.push('This file has no calculators, so your calculators were kept.');
    }

    return {
      success: errors.length === 0,
      calculatorsAdded,
      materialsAdded,
      laborAdded,
      categoriesAdded,
      functionsAdded,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      success: false,
      calculatorsAdded,
      materialsAdded,
      laborAdded,
      categoriesAdded,
      functionsAdded,
      errors: [err instanceof Error ? err.message : 'Unknown error during import'],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
