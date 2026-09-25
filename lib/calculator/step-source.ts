import { getOutermostFunctionCalls, parseFunctionCalls } from '../formula/parser';
import type { SharedFunction } from '../types';
import { normalizeToBase } from '../units';
import { formatDisplayNumber } from '../utils';
import type { Binding, Calculator, StepSource } from './types';

type CallSource = Extract<StepSource, { type: 'call' }>;

/** A binding as it would be written in a formula (numbers in base units). */
export function bindingToText(binding: Binding | undefined): string {
  if (!binding) return '?';
  switch (binding.type) {
    case 'input':
    case 'step':
      return binding.key;
    case 'constant':
      return formatDisplayNumber(binding.unitSymbol ? normalizeToBase(binding.value, binding.unitSymbol) : binding.value);
    case 'property':
      return `${binding.inputKey}.${binding.property}`;
  }
}

/** A function-call step written as a formula, e.g. `sheets_width(width, sheets)`. */
export function callToExpression(source: CallSource, functions: SharedFunction[]): string {
  const fn = functions.find((candidate) => candidate.name === source.functionName);
  const names = fn ? fn.parameters.map((param) => param.name) : Object.keys(source.args);
  return `${source.functionName}(${names.map((name) => bindingToText(source.args[name])).join(', ')})`;
}

/**
 * A formula that is exactly one call of a shared function, with each argument an input, a
 * step, a number, or a property of a picked material/labor, as a function-call step.
 * Anything else (arithmetic around the call, nested calls, unknown names) gives undefined.
 */
export function expressionToCall(
  expression: string,
  calculator: Calculator,
  functions: SharedFunction[]
): CallSource | undefined {
  const trimmed = expression.trim();
  const calls = getOutermostFunctionCalls(parseFunctionCalls(trimmed));
  if (calls.length !== 1 || calls[0].startIndex !== 0 || calls[0].endIndex !== trimmed.length) return undefined;
  const call = calls[0];
  const fn = functions.find((candidate) => candidate.name === call.functionName);
  if (!fn || call.arguments.length !== fn.parameters.length) return undefined;

  const inputs = new Map(calculator.inputs.map((input) => [input.key, input]));
  const stepKeys = new Set(calculator.steps.map((step) => step.key));
  const args: Record<string, Binding> = {};
  for (let i = 0; i < fn.parameters.length; i += 1) {
    const text = call.arguments[i].trim();
    const name = fn.parameters[i].name;
    const property = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/);
    if (inputs.has(text)) args[name] = { type: 'input', key: text };
    else if (stepKeys.has(text)) args[name] = { type: 'step', key: text };
    else if (text !== '' && Number.isFinite(Number(text))) args[name] = { type: 'constant', value: Number(text) };
    else if (
      property &&
      (inputs.get(property[1])?.value.kind === 'material' || inputs.get(property[1])?.value.kind === 'labor')
    ) {
      args[name] = { type: 'property', inputKey: property[1], property: property[2] };
    } else return undefined;
  }
  return { type: 'call', functionName: fn.name, args };
}
