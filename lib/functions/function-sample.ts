import { callFunction, type FunctionArgValue } from '../calculator/call-function';
import type { Labor, Material, SharedFunction } from '../types';
import { getFunctionParamKinds } from './param-kinds';
import { convertFromBase, normalizeToBase } from '../units';
import { formatDisplayNumber } from '../utils';

export { getFunctionParamKinds, type FunctionParamKind } from './param-kinds';

export interface FunctionSampleResult {
  /** Result in the return unit, formatted with it; undefined when it can't evaluate. */
  display?: string;
  error?: string;
}

// Tries a function with typed values, through the same callFunction calculators use.
// Numbers are typed in each parameter's unit and converted to base units first; materials and
// labor are picked by variable name; yes/no is "true" or "false". The result is shown in the
// return unit.
export function evaluateFunctionSample(input: {
  func: Pick<SharedFunction, 'formula' | 'parameters' | 'returnUnitSymbol'> & Partial<Pick<SharedFunction, 'name'>>;
  /** Typed values: numbers (in the parameter's unit), a material/labor variable name, or true/false. */
  values: Record<string, string>;
  materials: Material[];
  labor?: Labor[];
  functions: SharedFunction[];
}): FunctionSampleResult {
  const { func } = input;
  if (!func.formula.trim()) return { error: 'Add a formula to try this function.' };

  const kinds = getFunctionParamKinds(func);
  const args: Record<string, FunctionArgValue> = {};
  for (const param of func.parameters) {
    if (!param.name) continue;
    const raw = (input.values[param.name] ?? '').trim();
    const label = param.label || param.name;
    const kind = kinds[param.name];
    if (raw === '') {
      if (kind === 'boolean') {
        args[param.name] = false;
        continue;
      }
      return { error: `${kind === 'material' || kind === 'labor' ? 'Choose' : 'Enter'} a value for ${label}.` };
    }
    if (kind === 'material' || kind === 'labor') {
      args[param.name] = raw;
      continue;
    }
    if (kind === 'boolean') {
      args[param.name] = raw === 'true';
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return { error: `${label} must be a number.` };
    args[param.name] = param.unitSymbol ? normalizeToBase(numeric, param.unitSymbol) : numeric;
  }

  try {
    const result = callFunction(
      { id: '', displayName: '', createdAt: '', updatedAt: '', ...func, name: func.name || 'this function' },
      args,
      { materials: input.materials, labor: input.labor ?? [], functions: input.functions }
    );
    const shown = func.returnUnitSymbol ? convertFromBase(result, func.returnUnitSymbol) : result;
    const formatted = formatDisplayNumber(shown);
    return { display: func.returnUnitSymbol ? `${formatted} ${func.returnUnitSymbol}` : formatted };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not evaluate this function.' };
  }
}
