import { calculateModuleInstance } from '../calculations/module-calculator';
import type {
  CalculationModule,
  Labor,
  Material,
  QuoteLineItem,
  QuoteModuleInstance,
  SharedFunction,
} from '../types';
import { convertFromBase } from '../units';
import { generateId } from '../utils';

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
  const checkedOutputs = input.moduleDef.computedOutputs?.filter((output) => output.showInQuote) || [];
  let primarySummary: string | undefined;

  if (checkedOutputs.length > 0) {
    const outputSummaries = checkedOutputs
      .map((output) => {
        const value = resolvedWithComputed[`out.${output.variableName}`];
        if (value !== null && value !== undefined) {
          const unitStr = output.unitSymbol ? ` ${output.unitSymbol}` : '';
          return `${output.label}: ${value}${unitStr}`;
        }
        return null;
      })
      .filter((summary): summary is string => summary !== null);

    if (outputSummaries.length > 0) {
      let summary = outputSummaries.join(', ');
      const materialField = input.moduleDef.fields.find((field) => field.type === 'material');
      if (materialField) {
        const materialVarName = input.resolvedFieldValues[materialField.variableName];
        if (typeof materialVarName === 'string') {
          const material = input.materials.find((item) => item.variableName === materialVarName);
          if (material) {
            summary += ` — ${material.name}`;
          }
        }
      }
      primarySummary = summary;
    }
  }

  const dimensionFields: Array<{ label: string; value: number | string; unitSymbol: string }> = [];
  input.moduleDef.fields.forEach((field) => {
    const value = input.resolvedFieldValues[field.variableName];
    if (value !== null && value !== undefined && field.unitCategory === 'length' && field.unitSymbol) {
      const displayValue = typeof value === 'number'
        ? convertFromBase(value, field.unitSymbol)
        : value;

      dimensionFields.push({
        label: field.label,
        value: displayValue,
        unitSymbol: field.unitSymbol,
      });
    }
  });

  const secondarySummary = dimensionFields.length > 0
    ? dimensionFields.map((dimension) => `${dimension.label}: ${dimension.value} ${dimension.unitSymbol}`).join(' - ')
    : undefined;

  const summaryParts: string[] = [];
  input.moduleDef.fields.slice(0, 4).forEach((field) => {
    const value = input.resolvedFieldValues[field.variableName];
    if (value !== null && value !== undefined) {
      summaryParts.push(`${field.label}: ${value}`);
    }
  });

  const fieldSummary = summaryParts.join(', ') || 'No details';

  return {
    lineItem: {
      id: generateId(),
      moduleId: input.instance.moduleId,
      moduleName: input.moduleDef.name,
      fieldValues: { ...resolvedWithComputed },
      fieldSummary: fieldSummary || 'No details',
      primarySummary,
      secondarySummary,
      cost: calculation.cost,
      createdAt: new Date().toISOString(),
    },
  };
}
