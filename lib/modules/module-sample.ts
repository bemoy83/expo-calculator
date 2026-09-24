import { calculateModuleInstance } from '../calculations/module-calculator';
import { getInitialFieldValue } from '../field-defaults';
import { formatDisplayNumber } from '../utils';
import type { CalculationModule, ComputedOutput, Field, Labor, Material, SharedFunction } from '../types';

export type SampleValues = Record<string, string | number | boolean>;

export interface SampleOutput {
  id: string;
  label: string;
  variableName: string;
  /** Formatted value with its unit, or undefined when it couldn't be computed. */
  display?: string;
  showInQuote: boolean;
}

export interface SampleResult {
  /** Undefined when the module can't calculate with these samples. */
  cost?: number;
  error?: string;
  outputs: SampleOutput[];
}

// Starting sample for each field: its default, and for material/labor pickers the first
// item in the field's category (a picker has no default, so the cost would otherwise be 0).
export function getSampleDefaults(fields: Field[], materials: Material[], labor: Labor[]): SampleValues {
  const defaults: SampleValues = {};
  for (const field of fields) {
    if (!field.variableName) continue;
    if (field.type === 'material' || field.type === 'labor') {
      const category = (field.type === 'material' ? field.materialCategory : field.laborCategory)?.trim();
      const items: Array<{ variableName: string; category: string }> = field.type === 'material' ? materials : labor;
      const first = items.find((item) => !category || item.category === category);
      defaults[field.variableName] = first?.variableName ?? '';
      continue;
    }
    defaults[field.variableName] = getInitialFieldValue(field);
  }
  return defaults;
}

// Runs the module being edited against sample values with the same calculator quotes use,
// reporting the cost, every computed output, and the calculator's own error message.
export function evaluateModuleSample(input: {
  fields: Field[];
  formula: string;
  computedOutputs: ComputedOutput[];
  values: SampleValues;
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): SampleResult {
  const moduleDef: CalculationModule = {
    id: 'sample',
    name: 'Sample',
    fields: input.fields,
    formula: input.formula,
    computedOutputs: input.computedOutputs,
    createdAt: '',
    updatedAt: '',
  };
  const calculation = calculateModuleInstance({
    moduleDef,
    fieldValues: input.values,
    materials: input.materials,
    labor: input.labor,
    functions: input.functions,
  });

  const outputs = input.computedOutputs
    .filter((output) => output.variableName)
    .map((output) => {
      const value = calculation.computedValues[`out.${output.variableName}`];
      const formatted =
        typeof value === 'number' && Number.isFinite(value) ? formatDisplayNumber(value) : undefined;
      return {
        id: output.id,
        label: output.label || output.variableName,
        variableName: output.variableName,
        display: formatted === undefined ? undefined : output.unitSymbol ? `${formatted} ${output.unitSymbol}` : formatted,
        showInQuote: !!output.showInQuote,
      };
    });

  if (!input.formula.trim()) {
    return { outputs, error: 'Add a cost formula to calculate this module.' };
  }
  if (calculation.errors.length > 0) {
    return { outputs, error: calculation.errors[0].message };
  }
  return { outputs, cost: calculation.cost };
}
