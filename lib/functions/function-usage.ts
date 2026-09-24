import type { CalculationModule, SharedFunction } from '../types';

export interface FunctionUsage {
  modules: Array<{ id: string; name: string }>;
  functions: Array<{ id: string; name: string }>;
}

function callsFunction(expression: string | undefined, functionName: string): boolean {
  if (!expression || !functionName) return false;
  // `name(` as a whole identifier: not `xname(` and not a property like `a.name(`.
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_.])${escaped}\\s*\\(`).test(expression);
}

// Where a shared function is called: module formulas and computed outputs, and other
// functions' formulas. Renaming or deleting it breaks every caller listed here.
export function findFunctionUsage(
  functionName: string,
  modules: CalculationModule[],
  functions: SharedFunction[],
  ownId?: string
): FunctionUsage {
  return {
    modules: modules
      .filter(
        (module) =>
          callsFunction(module.formula, functionName) ||
          (module.computedOutputs ?? []).some((output) => callsFunction(output.expression, functionName))
      )
      .map((module) => ({ id: module.id, name: module.name })),
    functions: functions
      .filter((func) => func.id !== ownId && callsFunction(func.formula, functionName))
      .map((func) => ({ id: func.id, name: func.displayName || func.name })),
  };
}

export function describeFunctionUsage(usage: FunctionUsage): string {
  const parts = [
    ...usage.modules.map((module) => module.name),
    ...usage.functions.map((func) => `${func.name} (function)`),
  ];
  return parts.join(', ');
}

export function formatFunctionSignature(func: Pick<SharedFunction, 'name' | 'parameters'>): string {
  return `${func.name || 'name'}(${func.parameters.map((param) => param.name).join(', ')})`;
}
