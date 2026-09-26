import { getFunctionParamKinds } from '../functions/param-kinds';
import { parseFunctionCalls } from '../formula/parser';
import type { Labor, Material, SharedFunction } from '../types';
import { scanExpression } from './dependencies';
import type { Calculator } from './types';

/** Always there: `price` is a material's default price and `cost` labor's rate. */
const BUILT_IN = new Set(['price', 'cost']);

// Properties a function reads from one of its parameters: `param.width` in its formula, and
// what the functions it passes the parameter to read (a few levels deep).
function propertiesReadByParam(fn: SharedFunction, param: string, functions: SharedFunction[], depth = 0): Set<string> {
  const read = new Set<string>();
  if (depth > 4) return read;
  for (const token of scanExpression(fn.formula)) {
    if (token.base === param && token.property) read.add(token.property);
  }
  for (const call of parseFunctionCalls(fn.formula)) {
    const inner = functions.find((candidate) => candidate.name === call.functionName);
    if (!inner) continue;
    call.arguments.forEach((arg, index) => {
      const innerParam = inner.parameters[index]?.name;
      if (arg.trim() === param && innerParam) {
        propertiesReadByParam(inner, innerParam, functions, depth + 1).forEach((name) => read.add(name));
      }
    });
  }
  return read;
}

/**
 * For each material or labor input, the properties the calculator reads from what's picked:
 * `sheets.width` in formulas, property bindings, and properties read inside functions the
 * input is passed to. Built-in `price`/`cost` are left out.
 */
export function requiredProperties(calculator: Calculator, functions: SharedFunction[]): Map<string, string[]> {
  const pickers = new Set(
    calculator.inputs.filter((input) => input.value.kind === 'material' || input.value.kind === 'labor').map((input) => input.key)
  );
  const required = new Map<string, Set<string>>();
  const add = (key: string, property: string) => {
    if (!pickers.has(key) || BUILT_IN.has(property)) return;
    required.set(key, (required.get(key) ?? new Set()).add(property));
  };
  const addFromCall = (functionName: string, args: Array<string | undefined>) => {
    const fn = functions.find((candidate) => candidate.name === functionName);
    if (!fn) return;
    const kinds = getFunctionParamKinds(fn);
    fn.parameters.forEach((param, index) => {
      const key = args[index];
      if (key && pickers.has(key) && kinds[param.name] !== 'number') {
        propertiesReadByParam(fn, param.name, functions).forEach((property) => add(key, property));
      }
    });
  };

  for (const step of calculator.steps) {
    if (step.source.type === 'call') {
      const source = step.source;
      const fn = functions.find((candidate) => candidate.name === source.functionName);
      for (const binding of Object.values(source.args)) {
        if (binding.type === 'property') add(binding.inputKey, binding.property);
      }
      if (fn) {
        addFromCall(
          fn.name,
          fn.parameters.map((param) => {
            const binding = source.args[param.name];
            return binding?.type === 'input' ? binding.key : undefined;
          })
        );
      }
      continue;
    }
    const expression = step.source.expression;
    for (const token of scanExpression(expression)) {
      if (token.property) add(token.base, token.property);
    }
    for (const call of parseFunctionCalls(expression)) {
      addFromCall(call.functionName, call.arguments.map((arg) => arg.trim()));
    }
  }
  return new Map([...required].map(([key, properties]) => [key, [...properties].sort()]));
}

/** The required properties a catalog item lacks (built-in price/cost never count). */
export function missingProperties(item: Material | Labor, required: string[] | undefined): string[] {
  if (!required || required.length === 0) return [];
  const names = new Set((item.properties ?? []).map((property) => property.name));
  return required.filter((property) => !names.has(property));
}
