/**
 * Computed Outputs Evaluation
 * 
 * Evaluates computed outputs for a module instance.
 * Returns computed values and any errors encountered during evaluation.
 */

import { CalculationModule, Material, SharedFunction, Labor } from '../types';
import { evaluateFormula, EvaluationContext } from '../formula-evaluator';

export interface ComputedOutputEvaluationResult {
  computedValues: Record<string, number>; // Maps 'out.variableName' -> value
  errors: Array<{ outputId: string; outputLabel: string; error: string }>;
}

/**
 * Evaluates all computed outputs for a module
 * 
 * @param moduleDef - Module definition with computed outputs
 * @param resolvedFieldValues - Resolved field values (after field links)
 * @param materials - Available materials
 * @param functions - Available functions
 * @returns Computed values and errors
 */
export function evaluateComputedOutputs(
  moduleDef: CalculationModule,
  resolvedFieldValues: Record<string, string | number | boolean>,
  materials: Material[],
  functions: SharedFunction[],
  labor: Labor[] = []
): ComputedOutputEvaluationResult {
  const computedValues: Record<string, number> = {};
  const errors: Array<{ outputId: string; outputLabel: string; error: string }> = [];

  if (!moduleDef.computedOutputs || moduleDef.computedOutputs.length === 0) {
    return { computedValues, errors };
  }

  const context: EvaluationContext = {
    fieldValues: resolvedFieldValues,
    materials,
    labor,
    functions,
    fields: moduleDef.fields.map((f) => ({
      variableName: f.variableName,
      type: f.type,
      materialCategory: f.materialCategory,
    })),
  };

  // Evaluate each computed output sequentially
  // Each output can reference previously evaluated outputs by their variable name
  for (const output of moduleDef.computedOutputs) {
    try {
      // Update context to include previously evaluated computed outputs
      // Add them as regular variables (without 'out.' prefix) so they can be referenced directly
      const contextWithComputed: EvaluationContext = {
        ...context,
        fieldValues: {
          ...context.fieldValues,
          // Add previously evaluated computed outputs as regular variables
          ...Object.fromEntries(
            Object.entries(computedValues).map(([key, value]) => [
              key.replace('out.', ''), // Remove 'out.' prefix for direct access
              value,
            ])
          ),
        },
      };
      
      const value = evaluateFormula(output.expression, contextWithComputed);
      
      const storageKey = `out.${output.variableName}`;
      computedValues[storageKey] = value;
    } catch (error: any) {
      errors.push({
        outputId: output.id,
        outputLabel: output.label,
        error: error.message || 'Evaluation failed',
      });
    }
  }

  return { computedValues, errors };
}
