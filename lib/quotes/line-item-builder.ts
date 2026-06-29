import { calculateModuleInstance } from '../calculations/module-calculator';
import type {
  CalculationModule,
  Labor,
  Material,
  QuoteLineItem,
  QuoteModuleInstance,
  SharedFunction,
} from '../types';
import { generateId } from '../utils';
import { buildLineItemSummaries } from './line-item-summary';

export function buildQuoteLineItem(input: {
  instance: QuoteModuleInstance;
  moduleDef: CalculationModule;
  resolvedFieldValues: Record<string, any>;
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): { lineItem: QuoteLineItem | null; error?: string } {
  const calculation = calculateModuleInstance({
    moduleDef: input.moduleDef,
    fieldValues: input.resolvedFieldValues,
    materials: input.materials,
    labor: input.labor,
    functions: input.functions,
  });

  if (calculation.errors.length > 0) {
    return { lineItem: null, error: calculation.errors[0].message };
  }

  const resolvedWithComputed = calculation.fieldValues;
  const summaries = buildLineItemSummaries({
    moduleDef: input.moduleDef,
    resolvedFieldValues: input.resolvedFieldValues,
    fieldValuesWithComputed: resolvedWithComputed,
    materials: input.materials,
  });

  return {
    lineItem: {
      id: generateId(),
      moduleId: input.instance.moduleId,
      moduleName: input.moduleDef.name,
      fieldValues: { ...resolvedWithComputed },
      fieldSummary: summaries.fieldSummary,
      primarySummary: summaries.primarySummary,
      secondarySummary: summaries.secondarySummary,
      cost: calculation.cost,
      createdAt: new Date().toISOString(),
    },
  };
}
