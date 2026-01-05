import { CalculationModule, Material, ModuleTemplate, SharedFunction } from '../types';
import { useModulesStore } from '../stores/modules-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useTemplatesStore } from '../stores/templates-store';
import { useFunctionsStore } from '../stores/functions-store';
import type { ExportedData } from './data-export';

export interface ImportOptions {
  mode: 'replace' | 'merge';
}

export interface ImportResult {
  success: boolean;
  modulesAdded: number;
  materialsAdded: number;
  categoriesAdded: number;
  functionsAdded: number;
  templatesAdded: number;
  errors?: string[];
}

/**
 * Validate imported data structure
 */
export function validateImportedData(json: unknown): json is ExportedData {
  if (!json || typeof json !== 'object') {
    return false;
  }

  const data = json as Record<string, unknown>;

  // Check required top-level keys (templates optional for backward compatibility)
  if (
    typeof data.version !== 'string' ||
    typeof data.exportedAt !== 'string' ||
    !Array.isArray(data.modules) ||
    !Array.isArray(data.materials) ||
    !Array.isArray(data.customCategories)
  ) {
    return false;
  }

  // Validate modules structure
  for (const mod of data.modules) {
    if (
      typeof mod !== 'object' ||
      typeof (mod as CalculationModule).id !== 'string' ||
      typeof (mod as CalculationModule).name !== 'string' ||
      !Array.isArray((mod as CalculationModule).fields) ||
      typeof (mod as CalculationModule).formula !== 'string'
    ) {
      return false;
    }
    // Validate computedOutputs if present
    if ((mod as CalculationModule).computedOutputs !== undefined) {
      if (!Array.isArray((mod as CalculationModule).computedOutputs)) {
        return false;
      }
      for (const output of (mod as CalculationModule).computedOutputs || []) {
        if (
          typeof output !== 'object' ||
          typeof output.id !== 'string' ||
          typeof output.label !== 'string' ||
          typeof output.variableName !== 'string' ||
          typeof output.expression !== 'string'
        ) {
          return false;
        }
      }
    }
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

  // Validate templates structure (if present, but templates are not imported)
  if (data.templates !== undefined) {
    if (!Array.isArray(data.templates)) {
      return false;
    }
    for (const template of data.templates) {
      if (
        typeof template !== 'object' ||
        typeof (template as ModuleTemplate).id !== 'string' ||
        typeof (template as ModuleTemplate).name !== 'string' ||
        !Array.isArray((template as ModuleTemplate).moduleInstances)
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Import data with replace or merge mode
 */
export function importData(
  data: ExportedData,
  options: ImportOptions
): ImportResult {
  const errors: string[] = [];
  let modulesAdded = 0;
  let materialsAdded = 0;
  let categoriesAdded = 0;
  let functionsAdded = 0;
  let templatesAdded = 0;

  try {
    if (options.mode === 'replace') {
      // Clear all stores
      useModulesStore.setState({ modules: [] });
      useMaterialsStore.setState({ materials: [] });
      useCategoriesStore.setState({ customCategories: [] });
      useFunctionsStore.setState({ functions: [] });
      useTemplatesStore.setState({ templates: [] });
    }

    // Import modules
    if (options.mode === 'replace') {
      // In replace mode, add all modules
      data.modules.forEach((mod) => {
        try {
          useModulesStore.getState().addModule({
            name: mod.name,
            description: mod.description,
            category: mod.category,
            fields: mod.fields,
            formula: mod.formula,
            computedOutputs: mod.computedOutputs,
          });
          modulesAdded++;
        } catch (err) {
          errors.push(`Failed to import module "${mod.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      });
    } else {
      // Merge mode: skip duplicates by name (case-insensitive)
      const existingModules = useModulesStore.getState().modules;
      const existingNames = new Set(existingModules.map((m) => m.name.toLowerCase()));

      data.modules.forEach((mod) => {
        if (!existingNames.has(mod.name.toLowerCase())) {
          try {
            useModulesStore.getState().addModule({
              name: mod.name,
              description: mod.description,
              category: mod.category,
              fields: mod.fields,
              formula: mod.formula,
              computedOutputs: mod.computedOutputs,
            });
            modulesAdded++;
          } catch (err) {
            errors.push(`Failed to import module "${mod.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      });
    }

    // Import materials
    if (options.mode === 'replace') {
      // In replace mode, add all materials
      data.materials.forEach((material) => {
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
            properties: material.properties,
          });
          materialsAdded++;
        } catch (err) {
          errors.push(`Failed to import material "${material.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      });
    } else {
      // Merge mode: skip duplicates by variableName (unique identifier)
      const existingMaterials = useMaterialsStore.getState().materials;
      const existingVariableNames = new Set(existingMaterials.map((m) => m.variableName));

      data.materials.forEach((material) => {
        if (!existingVariableNames.has(material.variableName)) {
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
              properties: material.properties,
            });
            materialsAdded++;
          } catch (err) {
            errors.push(`Failed to import material "${material.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      });
    }

    // Import categories
    const existingCategories = useCategoriesStore.getState().customCategories;
    const existingCategoriesSet = new Set(existingCategories);

    data.customCategories.forEach((category) => {
      if (!existingCategoriesSet.has(category)) {
        try {
          useCategoriesStore.getState().addCategory(category);
          categoriesAdded++;
        } catch (err) {
          errors.push(`Failed to import category "${category}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    });

    // Import functions
    if (data.functions && data.functions.length > 0) {
      if (options.mode === 'replace') {
        // In replace mode, add all functions
        data.functions.forEach((func) => {
          try {
            useFunctionsStore.getState().addFunction({
              displayName: func.displayName || func.name, // Backward compatibility: use name as displayName if displayName not present
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
        });
      } else {
        // Merge mode: skip duplicates by name (case-insensitive)
        const existingFunctions = useFunctionsStore.getState().functions;
        const existingNames = new Set(existingFunctions.map((f) => f.name.toLowerCase()));

        data.functions.forEach((func) => {
          if (!existingNames.has(func.name.toLowerCase())) {
            try {
              useFunctionsStore.getState().addFunction({
                displayName: func.displayName || func.name, // Backward compatibility: use name as displayName if displayName not present
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
          }
        });
      }
    }

    // Templates are not imported because they reference module IDs which get regenerated on import
    // This would break template functionality. Templates must be recreated manually after importing modules.
    // templatesAdded remains 0

    return {
      success: errors.length === 0,
      modulesAdded,
      materialsAdded,
      categoriesAdded,
      functionsAdded,
      templatesAdded,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      modulesAdded,
      materialsAdded,
      categoriesAdded,
      functionsAdded,
      templatesAdded,
      errors: [err instanceof Error ? err.message : 'Unknown error during import'],
    };
  }
}

