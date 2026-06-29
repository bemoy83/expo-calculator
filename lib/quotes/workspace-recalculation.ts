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
  const modulesWithComputedOutputs = calculateInstances(input.workspaceModules, input);
  const { resolvedValues, brokenLinks } = resolveFieldLinksWithMetadata(modulesWithComputedOutputs);
  const cleanedModules = removeBrokenFieldLinks(modulesWithComputedOutputs, brokenLinks);

  const workspaceModules = calculateInstances(cleanedModules, input, resolvedValues);

  return {
    workspaceModules,
    resolvedValues,
    brokenLinks,
  };
}

function calculateInstances(
  workspaceModules: QuoteModuleInstance[],
  input: {
    modules: CalculationModule[];
    materials: Material[];
    labor: Labor[];
    functions: SharedFunction[];
  },
  resolvedValues?: Record<string, Record<string, any>>
): QuoteModuleInstance[] {
  return workspaceModules.map((moduleInstance) => {
    const moduleDef = input.modules.find((module) => module.id === moduleInstance.moduleId);
    if (!moduleDef) return moduleInstance;

    const resolved = resolvedValues?.[moduleInstance.id] || moduleInstance.fieldValues;
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
}
