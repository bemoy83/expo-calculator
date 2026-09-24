import type { CalculationModule, ModuleTemplate } from '../types';

type ModuleRef = Pick<CalculationModule, 'id' | 'name'>;

export type ImportedTemplateData = Omit<ModuleTemplate, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Map each module ID in an import file to the ID the module has after the import.
 * Modules the import added map to their new ID (`addedIds`). Modules it skipped
 * (merge mode, name already taken) map to the existing module with the same name,
 * case-insensitive, like the skip itself.
 */
export function buildModuleIdMap(
  importedModules: ModuleRef[],
  existingModules: ModuleRef[],
  addedIds: Map<string, string>
): Map<string, string> {
  const existingByName = new Map<string, string>();
  existingModules.forEach((mod) => {
    const key = mod.name.toLowerCase();
    if (!existingByName.has(key)) existingByName.set(key, mod.id);
  });

  const moduleIdMap = new Map<string, string>();
  importedModules.forEach((mod) => {
    const newId = addedIds.get(mod.id) ?? existingByName.get(mod.name.toLowerCase());
    if (newId) moduleIdMap.set(mod.id, newId);
  });
  return moduleIdMap;
}

/**
 * Point a template's module instances at the modules' IDs after an import.
 * Instance IDs and field links are kept as they are: links refer to other
 * instances of the same template (by instance ID or `__index_N__`), not to modules.
 * Instances whose module can't be mapped keep their old module ID (applying the
 * template then reports the module as missing) and are listed in `missingModules`
 * by name when the import file knows it.
 */
export function remapTemplateModules(
  template: ModuleTemplate,
  moduleIdMap: Map<string, string>,
  moduleNames: Map<string, string>
): { template: ImportedTemplateData; missingModules: string[] } {
  const missingModules: string[] = [];

  const moduleInstances = template.moduleInstances.map((instance) => {
    const newModuleId = moduleIdMap.get(instance.moduleId);
    if (!newModuleId) {
      const name = moduleNames.get(instance.moduleId) ?? instance.moduleId;
      if (!missingModules.includes(name)) missingModules.push(name);
      return { ...instance };
    }
    return { ...instance, moduleId: newModuleId };
  });

  return {
    template: {
      name: template.name,
      description: template.description,
      moduleInstances,
      categories: Array.isArray(template.categories) ? template.categories : [],
      moduleVersion: template.moduleVersion,
      createdFromQuoteId: template.createdFromQuoteId,
    },
    missingModules,
  };
}

export function formatMissingModulesWarning(templateName: string, missingModules: string[]): string {
  const quoted = missingModules.map((name) => `"${name}"`).join(', ');
  return `Template "${templateName}" uses ${missingModules.length === 1 ? 'a module' : 'modules'} that ${missingModules.length === 1 ? "isn't" : "aren't"} in your data: ${quoted}. It was imported anyway; applying it skips the missing ${missingModules.length === 1 ? 'module' : 'modules'}.`;
}
