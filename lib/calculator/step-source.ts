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

function callStepFormula(source: CallSource, functions: SharedFunction[]): string {
  if (!source.functionName) return '';
  const fn = functions.find((candidate) => candidate.name === source.functionName);
  const args = { ...source.args };
  for (const param of fn?.parameters ?? []) {
    if (param.name && !args[param.name]) args[param.name] = { type: 'input', key: param.name };
  }
  return callToExpression({ ...source, args }, functions);
}

/**
 * The calculator with every function-call step written as the formula it stands for, so a
 * step is only ever edited as a formula. A parameter with no value is written by its own
 * name, which the formula then flags as unknown (and offers to make an input); a call with
 * no function yet becomes an empty formula.
 */
export function callStepsToFormulas(calculator: Calculator, functions: SharedFunction[]): Calculator {
  if (!calculator.steps.some((step) => step.source.type === 'call')) return calculator;
  return {
    ...calculator,
    steps: calculator.steps.map((step) =>
      step.source.type === 'call'
        ? { ...step, source: { type: 'expression', expression: callStepFormula(step.source, functions) } }
        : step
    ),
  };
}
