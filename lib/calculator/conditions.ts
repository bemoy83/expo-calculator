import type { CalculatorInput, Condition } from './types';

export type ConditionOutcome = boolean | 'missing';

// Checks a condition against the calculator's resolved values. Choice inputs compare their
// option id with is/isNot and their number with the comparison operators.
export function evaluateCondition(
  condition: Condition,
  inputs: Map<string, CalculatorInput>,
  rawValues: Record<string, unknown>,
  resolvedValues: Record<string, number | boolean | string>
): ConditionOutcome {
  const input = inputs.get(condition.inputKey);
  if (!input || !(condition.inputKey in resolvedValues)) return 'missing';
  const resolved = resolvedValues[condition.inputKey];

  if (condition.op === 'is' || condition.op === 'isNot') {
    let current: unknown = resolved;
    if (input.value.kind === 'choice') {
      current = selectedChoiceId(input, rawValues[condition.inputKey]);
    }
    const same = current === condition.value;
    return condition.op === 'is' ? same : !same;
  }

  const numeric = typeof resolved === 'boolean' ? (resolved ? 1 : 0) : Number(resolved);
  if (!Number.isFinite(numeric)) return 'missing';
  switch (condition.op) {
    case '>':
      return numeric > condition.value;
    case '<':
      return numeric < condition.value;
    case '>=':
      return numeric >= condition.value;
    case '<=':
      return numeric <= condition.value;
  }
}

/** The option a choice input has selected: its value if valid, else its default. */
export function selectedChoiceId(input: CalculatorInput, raw: unknown): string | undefined {
  if (input.value.kind !== 'choice') return undefined;
  const { options } = input.value;
  if (typeof raw === 'string' && options.some((option) => option.id === raw)) return raw;
  const fallback = input.value.default;
  return fallback !== undefined && options.some((option) => option.id === fallback) ? fallback : undefined;
}
