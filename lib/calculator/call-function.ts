import { evaluateFormula } from '../formula/evaluator';
import type { Labor, Material, SharedFunction } from '../types';

/** Numbers in base units; a material or labor argument is its variable name. */
export type FunctionArgValue = number | boolean | string;

// Calls a shared function with values for its parameters, by name. The function sees its
// parameters, the catalogs, and the other functions, and nothing else.
export function callFunction(
  fn: SharedFunction,
  args: Record<string, FunctionArgValue>,
  library: { materials: Material[]; labor?: Labor[]; functions: SharedFunction[] }
): number {
  if (!fn.formula.trim()) {
    throw new Error(`Function "${fn.name}" has no formula.`);
  }
  const unset = fn.parameters.filter((param) => param.name && args[param.name] === undefined);
  if (unset.length > 0) {
    throw new Error(
      `Function "${fn.name}" needs a value for ${unset.map((param) => param.label || param.name).join(', ')}.`
    );
  }
  return evaluateFormula(fn.formula, {
    fieldValues: args,
    materials: library.materials,
    labor: library.labor ?? [],
    functions: library.functions,
  });
}
