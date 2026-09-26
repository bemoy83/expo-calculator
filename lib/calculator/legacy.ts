import type { CalculationModule, ModuleTemplate } from '../types';
import { regenerateComputedOutputVariableNames, sanitizeLegacyModule } from '../utils/computed-outputs';
import { calculatorsFromModules } from './from-module';
import { calculatorsFromTemplates } from './from-template';
import type { Calculator } from './types';

// Modules and templates were retired in favour of calculators. Until then every module and
// template was shown as a calculator converted on the fly (ids `module-…` and `template-…`),
// and quote lines point at those ids. These helpers turn them into saved calculators with the
// same ids, once, and read old export files.

/** Modules as the modules store loaded them: legacy fields and output names tidied. */
export function sanitizeModules(modules: CalculationModule[]): CalculationModule[] {
  return modules.map((module) => regenerateComputedOutputVariableNames(sanitizeLegacyModule(module)));
}

/**
 * Calculators for the modules and templates that don't have one yet: skipped when a saved
 * calculator already has the same id or was saved from the same module or template.
 */
export function calculatorsFromLegacy(
  modules: CalculationModule[],
  templates: ModuleTemplate[],
  existing: Calculator[]
): Calculator[] {
  const clean = sanitizeModules(modules);
  const ids = new Set(existing.map((calculator) => calculator.id));
  const savedModules = new Set(existing.map((calculator) => calculator.sourceModuleId).filter(Boolean));
  const savedTemplates = new Set(existing.map((calculator) => calculator.sourceTemplateId).filter(Boolean));
  return [
    ...calculatorsFromTemplates(templates, clean).filter(
      (calculator) => !ids.has(calculator.id) && !savedTemplates.has(calculator.sourceTemplateId)
    ),
    ...calculatorsFromModules(clean).filter(
      (calculator) => !ids.has(calculator.id) && !savedModules.has(calculator.sourceModuleId)
    ),
  ];
}

function readPersisted<T>(storage: Pick<Storage, 'getItem'>, key: string, field: string): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = (parsed?.state ?? parsed)?.[field];
    return Array.isArray(list) ? (list as T[]) : [];
  } catch {
    return [];
  }
}

/** The modules and templates the retired stores left in browser storage (they stay there). */
export function readLegacyStores(storage: Pick<Storage, 'getItem'>): {
  modules: CalculationModule[];
  templates: ModuleTemplate[];
} {
  return {
    modules: readPersisted<CalculationModule>(storage, 'modules-store', 'modules'),
    templates: readPersisted<ModuleTemplate>(storage, 'templates-store', 'templates'),
  };
}
