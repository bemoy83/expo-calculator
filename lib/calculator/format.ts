import { getUnit } from '../units';
import { formatDisplayNumber } from '../utils';
import type { Calculator, CalculatorStep, StepResult } from './types';

/** A unit symbol as people write it (m2 → m²). */
export function displayUnit(symbol: string | undefined): string | undefined {
  if (!symbol) return undefined;
  return getUnit(symbol)?.symbol ?? symbol;
}

/**
 * A step's value for display: money through the currency formatter, otherwise the value in
 * the step's unit (from `StepResult.displayValue`) with the unit.
 */
export function formatStepValue(
  step: CalculatorStep,
  displayValue: number,
  formatMoney: (amount: number) => string
): { text: string; unit?: string } {
  if (step.format === 'money') return { text: formatMoney(displayValue) };
  const shown = step.decimals !== undefined ? Number(displayValue.toFixed(step.decimals)) : displayValue;
  if (step.format === 'percent') return { text: formatDisplayNumber(shown), unit: '%' };
  return { text: formatDisplayNumber(shown), unit: displayUnit(step.unitSymbol) };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Why a step has no value, in words staff understand; undefined when it has one. */
export function describeStepProblem(result: StepResult | undefined, calculator: Calculator): string | undefined {
  if (!result) return 'Not calculated.';
  if (result.status === 'ok' || result.status === 'disabled') return undefined;
  if (result.missingInputs && result.missingInputs.length > 0) {
    return `Needs ${describeInputs(result.missingInputs, calculator)}`;
  }
  switch (result.status) {
    case 'missing':
      return 'Needs more values';
    case 'blocked': {
      const labels = (result.blockedBy ?? []).map(
        (key) => calculator.steps.find((step) => step.key === key)?.label ?? key
      );
      return labels.length > 0 ? `Waiting on ${joinNames(labels)}` : 'Waiting on another result';
    }
    case 'error':
      return result.message ?? "Can't calculate";
  }
}

/** Input labels for a list of keys, joined for a sentence. */
export function describeInputs(keys: string[], calculator: Calculator): string {
  return joinNames(keys.map((key) => calculator.inputs.find((input) => input.key === key)?.label ?? key));
}
