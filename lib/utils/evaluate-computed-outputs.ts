/**
 * Computed Outputs Evaluation
 * 
 * Evaluates computed outputs for a module instance.
 * Returns computed values and any errors encountered during evaluation.
 */

import { CalculationModule, ComputedOutput, Material, SharedFunction } from '../types';
import { evaluateFormula, EvaluationContext } from '../formula-evaluator';
import { useLaborStore } from '../stores/labor-store';

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
  functions: SharedFunction[]
): ComputedOutputEvaluationResult {
  const computedValues: Record<string, number> = {};
  const errors: Array<{ outputId: string; outputLabel: string; error: string }> = [];

  if (!moduleDef.computedOutputs || moduleDef.computedOutputs.length === 0) {
    return { computedValues, errors };
  }

  // Get labor from store
  const labor = useLaborStore.getState().labor;

  // Create evaluation context
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
      
      // Round to 2 decimal places to avoid floating point precision issues
      const roundedValue = Number(value.toFixed(2));
      
      // Store with 'out.' prefix
      const storageKey = `out.${output.variableName}`;
      computedValues[storageKey] = roundedValue;
    } catch (error: any) {
      // Log error and add to errors array
      console.error(`Error evaluating computed output '${output.label}':`, error.message);
      errors.push({
        outputId: output.id,
        outputLabel: output.label,
        error: error.message || 'Evaluation failed',
      });
      
      // Set to null (or 0) to indicate failure
      const storageKey = `out.${output.variableName}`;
      computedValues[storageKey] = 0; // Use 0 for failed outputs
    }
  }

  return { computedValues, errors };
}

