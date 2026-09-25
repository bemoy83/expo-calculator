import { convertFromBase, getUnit } from '../units';
import { formatDisplayNumber } from '../utils';
import type { Calculator, CalculatorStep, Condition, StepResult } from './types';

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

/** A condition in words: "Include insulation is on", "Finish is Gloss", "Width > 3 m". */
export function describeCondition(
  condition: Condition,
  calculator: Calculator,
  catalog: { materials: Array<{ variableName: string; name: string }>; labor: Array<{ variableName: string; name: string }> }
): string {
  const input = calculator.inputs.find((candidate) => candidate.key === condition.inputKey);
  if (!input) return `“${condition.inputKey}” (deleted input)`;
  const spec = input.value;
  if (condition.op === 'is' || condition.op === 'isNot') {
    const verb = condition.op === 'is' ? 'is' : 'is not';
    if (spec.kind === 'boolean') {
      const on = condition.value === true;
      return `${input.label} is ${(condition.op === 'is') === on ? 'on' : 'off'}`;
    }
    if (spec.kind === 'choice') {
      const option = spec.options.find((candidate) => candidate.id === condition.value);
      const unit = displayUnit(spec.unitSymbol);
      return `${input.label} ${verb} ${option ? `${option.label}${unit ? ` ${unit}` : ''}` : '(deleted value)'}`;
    }
    if (spec.kind === 'material' || spec.kind === 'labor') {
      const items = spec.kind === 'material' ? catalog.materials : catalog.labor;
      const item = items.find((candidate) => candidate.variableName === condition.value);
      return `${input.label} ${verb} ${item?.name ?? String(condition.value)}`;
    }
    return `${input.label} ${verb} ${String(condition.value)}`;
  }
  const unitSymbol = 'unitSymbol' in spec ? spec.unitSymbol : undefined;
  const value = Number(condition.value);
  const shown = formatDisplayNumber(unitSymbol ? convertFromBase(value, unitSymbol) : value);
  const symbol = { '>': '>', '<': '<', '>=': '≥', '<=': '≤' }[condition.op];
  const unit = displayUnit(unitSymbol);
  return `${input.label} ${symbol} ${shown}${unit ? ` ${unit}` : ''}`;
}
