import { CalculationModule, Material, ModuleTemplate, SharedFunction, Labor } from '../types';
import { useModulesStore } from '../stores/modules-store';
import { useMaterialsStore } from '../stores/materials-store';
import { fixPricePropertyStorage } from '../catalog/prices';
import { useCategoriesStore } from '../stores/categories-store';
import { useTemplatesStore } from '../stores/templates-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import type { ExportedData } from './data-export';
import {
  buildModuleIdMap,
  formatMissingModulesWarning,
  remapTemplateModules,
} from './data-import-remap';

export interface ImportOptions {
  mode: 'replace' | 'merge';
}

export interface ImportResult {
  success: boolean;
  modulesAdded: number;
  materialsAdded: number;
  laborAdded: number;
  categoriesAdded: number;
  functionsAdded: number;
  templatesAdded: number;
  errors?: string[];
  /** Things the user should know that didn't stop the import, e.g. templates with missing modules. */
  warnings?: string[];
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

  // Validate templates structure (if present; files before 1.1.0 have none)
  if (data.templates !== undefined) {
    if (!Array.isArray(data.templates)) {
      return false;
    }
    for (const template of data.templates) {
      if (
        !template ||
        typeof template !== 'object' ||
        typeof (template as ModuleTemplate).id !== 'string' ||
        typeof (template as ModuleTemplate).name !== 'string' ||
        !Array.isArray((template as ModuleTemplate).moduleInstances)
      ) {
        return false;
      }
      for (const instance of (template as ModuleTemplate).moduleInstances) {
        if (!instance || typeof instance !== 'object' || typeof instance.moduleId !== 'string') {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Import data with replace or merge mode.
 *
 * Replace deletes each kind of data the file contains, then imports it. Kinds an older
 * export file doesn't contain (labor, functions, templates) are left as they are;
 * templates kept that way are pointed at the imported modules with the same names.
 * Merge adds what's new and skips anything whose name (or variable name) is taken.
 * Quotes are never touched.
 */
export function importData(
  data: ExportedData,
  options: ImportOptions
): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let modulesAdded = 0;
  let materialsAdded = 0;
  let laborAdded = 0;
  let categoriesAdded = 0;
  let functionsAdded = 0;
  let templatesAdded = 0;
  const isReplace = options.mode === 'replace';

  try {
    // Modules as they were before the import: kept templates (older files) are remapped from these.
    const modulesBeforeImport = useModulesStore.getState().modules;

    if (isReplace) {
      useModulesStore.setState({ modules: [] });
      useMaterialsStore.setState({ materials: [] });
      useCategoriesStore.setState({ customCategories: [] });
      if (data.labor !== undefined) useLaborStore.setState({ labor: [] });
      if (data.functions !== undefined) useFunctionsStore.setState({ functions: [] });
      if (data.templates !== undefined) useTemplatesStore.setState({ templates: [] });
    }

    // Import modules, recording each added module's new ID so templates can follow it.
    // Merge mode skips duplicates by name (case-insensitive).
    const existingModules = useModulesStore.getState().modules;
    const existingModuleNames = new Set(existingModules.map((m) => m.name.toLowerCase()));
    const addedModuleIds = new Map<string, string>();

    data.modules.forEach((mod) => {
      if (!isReplace && existingModuleNames.has(mod.name.toLowerCase())) return;
      try {
        const added = useModulesStore.getState().addModule({
          name: mod.name,
          description: mod.description,
          category: mod.category,
          fields: mod.fields,
          formula: mod.formula,
          computedOutputs: mod.computedOutputs,
        });
        addedModuleIds.set(mod.id, added.id);
        modulesAdded++;
      } catch (err) {
        errors.push(`Failed to import module "${mod.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

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
            properties: fixPricePropertyStorage(material as Material).properties,
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
              properties: fixPricePropertyStorage(material as Material).properties,
            });
            materialsAdded++;
          } catch (err) {
            errors.push(`Failed to import material "${material.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      });
    }

    // Import labor
    if (data.labor && data.labor.length > 0) {
      if (options.mode === 'replace') {
        // In replace mode, add all labor items
        data.labor.forEach((laborItem) => {
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
        });
      } else {
        // Merge mode: skip duplicates by variableName (unique identifier)
        const existingLabor = useLaborStore.getState().labor;
        const existingVariableNames = new Set(existingLabor.map((l) => l.variableName));

        data.labor.forEach((laborItem) => {
          if (!existingVariableNames.has(laborItem.variableName)) {
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
          }
        });
      }
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

    // Import templates, pointing their module instances at the modules' IDs after the import.
    // Merge mode skips duplicates by name (case-insensitive).
    const moduleIdMap = buildModuleIdMap(data.modules, existingModules, addedModuleIds);
    const moduleNames = new Map(data.modules.map((m) => [m.id, m.name]));

    if (data.templates !== undefined) {
      const existingTemplateNames = new Set(
        useTemplatesStore.getState().templates.map((t) => t.name.toLowerCase())
      );

      data.templates.forEach((template) => {
        if (!isReplace && existingTemplateNames.has(template.name.toLowerCase())) return;
        try {
          const remapped = remapTemplateModules(template, moduleIdMap, moduleNames);
          useTemplatesStore.getState().addTemplate(remapped.template);
          templatesAdded++;
          if (remapped.missingModules.length > 0) {
            warnings.push(formatMissingModulesWarning(template.name, remapped.missingModules));
          }
        } catch (err) {
          errors.push(`Failed to import template "${template.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      });
    } else if (isReplace) {
      // Older file without templates: the current templates were kept, but their modules were
      // just replaced. Follow each module to the imported module with the same name.
      const keptModuleIdMap = buildModuleIdMap(
        modulesBeforeImport,
        useModulesStore.getState().modules,
        new Map()
      );
      const keptModuleNames = new Map(modulesBeforeImport.map((m) => [m.id, m.name]));
      const keptTemplates = useTemplatesStore.getState().templates.map((template) => {
        const remapped = remapTemplateModules(template, keptModuleIdMap, keptModuleNames);
        if (remapped.missingModules.length > 0) {
          warnings.push(formatMissingModulesWarning(template.name, remapped.missingModules));
        }
        return { ...template, moduleInstances: remapped.template.moduleInstances };
      });
      useTemplatesStore.setState({ templates: keptTemplates });
      if (keptTemplates.length > 0) {
        warnings.unshift(
          `This file has no templates (it was exported before templates were included), so your ${keptTemplates.length} existing template${keptTemplates.length === 1 ? ' was' : 's were'} kept.`
        );
      }
    }

    return {
      success: errors.length === 0,
      modulesAdded,
      materialsAdded,
      laborAdded,
      categoriesAdded,
      functionsAdded,
      templatesAdded,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      success: false,
      modulesAdded,
      materialsAdded,
      laborAdded,
      categoriesAdded,
      functionsAdded,
      templatesAdded,
      errors: [err instanceof Error ? err.message : 'Unknown error during import'],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

