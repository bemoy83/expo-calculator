import type { Calculator } from '../calculator/types';
import type { SharedFunction } from '../types';
import { NAME_CHAR, isValidName, matchStandalone } from '../formula/identifiers';

export interface FunctionUsage {
  functions: Array<{ id: string; name: string }>;
  calculators: Array<{ id: string; name: string }>;
}

function callsFunction(expression: string | undefined, functionName: string): boolean {
  if (!expression || !functionName) return false;
  // `name(` as a whole identifier: not `xname(` and not a property like `a.name(`.
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^${NAME_CHAR}.])${escaped}\\s*\\(`).test(expression);
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

/**
 * How many times the formula reads a parameter: the name on its own (`bredde`) or with a
 * property (`material.width`), not as another name's property (`board.bredde`).
 */
export function countParameterUses(formula: string, name: string): number {
  if (!formula || !isValidName(name)) return 0;
  return matchStandalone(formula, name).filter((match) => formula[match.index - 1] !== '.').length;
}

/** A copy's call name: `stendere` → `stendere_2`, or the next number not taken. */
export function freeCallName(name: string, functions: Pick<SharedFunction, 'name'>[]): string {
  const base = name.replace(/_\d+$/, '');
  const taken = new Set(functions.map((func) => func.name));
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** What Duplicate adds: the function under "… copy" and a free call name. */
export function copyOfFunction(
  func: SharedFunction,
  functions: Pick<SharedFunction, 'name'>[]
): Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = func;
  return { ...rest, displayName: `${func.displayName || func.name} copy`, name: freeCallName(func.name, functions) };
}
