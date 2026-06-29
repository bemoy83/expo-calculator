import { calculateModuleInstance } from '../calculations/module-calculator';
import type {
  CalculationModule,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from '../types';
import {
  BrokenFieldLink,
  removeBrokenFieldLinks,
  resolveFieldLinksWithMetadata,
} from '../utils/field-linking';

export function recalculateWorkspaceModuleInstances(input: {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): {
  workspaceModules: QuoteModuleInstance[];
  resolvedValues: Record<string, Record<string, any>>;
  brokenLinks: BrokenFieldLink[];
} {
  const { resolvedValues, brokenLinks } = resolveFieldLinksWithMetadata(input.workspaceModules);
  const cleanedModules = removeBrokenFieldLinks(input.workspaceModules, brokenLinks);

  const workspaceModules = cleanedModules.map((moduleInstance) => {
    const moduleDef = input.modules.find((module) => module.id === moduleInstance.moduleId);
    if (!moduleDef) return moduleInstance;

    const resolved = resolvedValues[moduleInstance.id] || moduleInstance.fieldValues;
    const calculation = calculateModuleInstance({
      moduleDef,
      fieldValues: resolved,
      materials: input.materials,
      labor: input.labor,
      functions: input.functions,
    });

    return {
      ...moduleInstance,
      fieldValues: {
        ...moduleInstance.fieldValues,
        ...calculation.computedValues,
      },
      calculatedCost: calculation.errors.length > 0 ? 0 : calculation.cost,
    };
  });

  return {
    workspaceModules,
    resolvedValues,
    brokenLinks,
  };
}
