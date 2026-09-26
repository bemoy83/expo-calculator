import type { Calculator } from '../calculator/types';
import type { SharedFunction } from '../types';

export interface FunctionUsage {
  functions: Array<{ id: string; name: string }>;
  calculators: Array<{ id: string; name: string }>;
}

function callsFunction(expression: string | undefined, functionName: string): boolean {
  if (!expression || !functionName) return false;
  // `name(` as a whole identifier: not `xname(` and not a property like `a.name(`.
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_.])${escaped}\\s*\\(`).test(expression);
}

// Where a shared function is called: calculators' steps (function-call steps and formulas)
// and other functions' formulas. Renaming or deleting it breaks every caller listed here.
export function findFunctionUsage(
  functionName: string,
  functions: SharedFunction[],
  ownId?: string,
  calculators: Calculator[] = []
): FunctionUsage {
  return {
    calculators: calculators
      .filter((calculator) =>
        calculator.steps.some((step) =>
          step.source.type === 'call'
            ? step.source.functionName === functionName
            : callsFunction(step.source.expression, functionName)
        )
      )
      .map((calculator) => ({ id: calculator.id, name: calculator.name })),
    functions: functions
      .filter((func) => func.id !== ownId && callsFunction(func.formula, functionName))
      .map((func) => ({ id: func.id, name: func.displayName || func.name })),
  };
}

export function describeFunctionUsage(usage: FunctionUsage): string {
  const parts = [
    ...usage.calculators.map((calculator) => `${calculator.name} (calculator)`),
    ...usage.functions.map((func) => `${func.name} (function)`),
  ];
  return parts.join(', ');
}

export function formatFunctionSignature(func: Pick<SharedFunction, 'name' | 'parameters'>): string {
  return `${func.name || 'name'}(${func.parameters.map((param) => param.name).join(', ')})`;
}
