import { evaluateFormula } from '../formula/evaluator';
import type { Material, SharedFunction } from '../types';
import { convertFromBase, normalizeToBase } from '../units';
import { formatDisplayNumber } from '../utils';

export type FunctionParamKind = 'number' | 'material';

// A parameter the formula reads properties from (`material.width`) expects a material,
// not a number. Parameters carry no type, so infer it from the formula.
export function getFunctionParamKinds(func: Pick<SharedFunction, 'formula' | 'parameters'>): Record<string, FunctionParamKind> {
  return Object.fromEntries(
    func.parameters.map((param) => {
      const escaped = param.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const readsProperty = !!param.name && new RegExp(`(^|[^A-Za-z0-9_.])${escaped}\\.[A-Za-z_]`).test(func.formula);
      return [param.name, readsProperty ? 'material' : 'number'];
    })
  );
}

export interface FunctionSampleResult {
  /** Result in the return unit, formatted with it; undefined when it can't evaluate. */
  display?: string;
  error?: string;
}

// Evaluates a function the way a module call does (evaluateFunctionCall): parameters are
// passed in base units, as module fields store them, with materials available and nothing
// else. Numbers typed in each parameter's unit are converted to base first, and the result
// is shown in the return unit.
export function evaluateFunctionSample(input: {
  func: Pick<SharedFunction, 'formula' | 'parameters' | 'returnUnitSymbol'>;
  /** Typed values: numbers (in the parameter's unit) or a material variable name. */
  values: Record<string, string>;
  materials: Material[];
  functions: SharedFunction[];
}): FunctionSampleResult {
  const { func } = input;
  if (!func.formula.trim()) return { error: 'Add a formula to try this function.' };

  const kinds = getFunctionParamKinds(func);
  const fieldValues: Record<string, string | number> = {};
  for (const param of func.parameters) {
    if (!param.name) continue;
    const raw = (input.values[param.name] ?? '').trim();
    if (raw === '') return { error: `Enter a value for ${param.label || param.name}.` };
    if (kinds[param.name] === 'material') {
      fieldValues[param.name] = raw;
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return { error: `${param.label || param.name} must be a number.` };
    fieldValues[param.name] = param.unitSymbol ? normalizeToBase(numeric, param.unitSymbol) : numeric;
  }

  try {
    const result = evaluateFormula(func.formula, {
      fieldValues,
      materials: input.materials,
      functions: input.functions,
    });
    const shown = func.returnUnitSymbol ? convertFromBase(result, func.returnUnitSymbol) : result;
    const formatted = formatDisplayNumber(shown);
    return { display: func.returnUnitSymbol ? `${formatted} ${func.returnUnitSymbol}` : formatted };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not evaluate this function.' };
  }
}
