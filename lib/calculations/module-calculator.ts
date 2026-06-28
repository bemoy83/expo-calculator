import { evaluateFormula } from '../formula-evaluator';
import {
  CalculationError,
  CalculationModule,
  CalculationResult,
  Labor,
  Material,
  SharedFunction,
} from '../types';
import { evaluateComputedOutputs } from '../utils/evaluate-computed-outputs';
import { roundMoney } from './money';

function toCalculationError(error: unknown, source?: string): CalculationError {
  const message = error instanceof Error ? error.message : 'Formula evaluation failed';
  const code: CalculationError['code'] =
    message.includes('Property') && message.includes('not found')
      ? 'missing_property'
      : message.includes('Cannot add') || message.includes('Cannot divide')
        ? 'unit_mismatch'
        : message.includes('Missing values')
          ? 'missing_value'
          : 'invalid_formula';

  return { code, message, source };
}

export function calculateModuleInstance(input: {
  moduleDef: CalculationModule;
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  labor?: Labor[];
  functions?: SharedFunction[];
  roundCost?: boolean;
}): CalculationResult {
  const functions = input.functions ?? [];
  const labor = input.labor ?? [];
  const computedResult = evaluateComputedOutputs(
    input.moduleDef,
    input.fieldValues,
    input.materials,
    functions,
    labor
  );

  const fieldValues = {
    ...input.fieldValues,
    ...computedResult.computedValues,
  };

  if (computedResult.errors.length > 0) {
    return {
      cost: 0,
      computedValues: computedResult.computedValues,
      fieldValues,
      errors: computedResult.errors.map((error) => ({
        code: 'computed_output_failed',
        message: error.error,
        source: error.outputLabel,
      })),
    };
  }

  try {
    const cost = evaluateFormula(input.moduleDef.formula, {
      fieldValues,
      materials: input.materials,
      labor,
      fields: input.moduleDef.fields.map((field) => ({
        variableName: field.variableName,
        type: field.type,
        materialCategory: field.materialCategory,
        laborCategory: field.laborCategory,
        defaultValue: field.defaultValue,
      })),
      functions,
    });

    return {
      cost: input.roundCost === false ? cost : roundMoney(cost),
      computedValues: computedResult.computedValues,
      fieldValues,
      errors: [],
    };
  } catch (error) {
    return {
      cost: 0,
      computedValues: computedResult.computedValues,
      fieldValues,
      errors: [toCalculationError(error, input.moduleDef.name)],
    };
  }
}
