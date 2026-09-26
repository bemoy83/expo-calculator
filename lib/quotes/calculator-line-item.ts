import { calculateQuoteTotals, roundMoney } from '../calculations/money';
import { evaluateCondition, selectedChoiceId } from '../calculator/conditions';
import { describeInputs, displayUnit, formatStepValue } from '../calculator/format';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorResult,
  CalculatorValues,
  Condition,
} from '../calculator/types';
import type { Quote, QuoteLineItem } from '../types';
import { convertFromBase } from '../units';
import { formatDisplayNumber, generateId } from '../utils';

/** An input's value as staff see it: in its unit, the option's label, the item's name, Yes/No. */
export function formatInputValue(
  input: CalculatorInput,
  values: CalculatorValues,
  result: CalculatorResult,
  library: Pick<CalculatorLibrary, 'materials' | 'labor'>
): string | undefined {
  const resolved = result.resolvedValues[input.key];
  const spec = input.value;
  switch (spec.kind) {
    case 'number': {
      if (typeof resolved !== 'number') return undefined;
      const shown = formatDisplayNumber(spec.unitSymbol ? convertFromBase(resolved, spec.unitSymbol) : resolved);
      const unit = displayUnit(spec.unitSymbol);
      return unit ? `${shown} ${unit}` : shown;
    }
    case 'boolean':
      return resolved ? 'Yes' : 'No';
    case 'choice': {
      const option = spec.options.find((candidate) => candidate.id === selectedChoiceId(input, values[input.key]));
      if (!option) return undefined;
      const unit = displayUnit(spec.unitSymbol);
      return unit ? `${option.label} ${unit}` : option.label;
    }
    case 'material':
      return library.materials.find((item) => item.variableName === resolved)?.name;
    case 'labor':
      return library.labor.find((item) => item.variableName === resolved)?.name;
    case 'text': {
      const text = typeof values[input.key] === 'string' ? String(values[input.key]) : spec.default;
      return text?.trim() ? text.trim() : undefined;
    }
  }
}

export type CalculatorLineItemOutcome = { ok: true; lineItem: QuoteLineItem } | { ok: false; error: string };

// A calculator's result as a quote line: its cost (the quote cost: the total, or the step the
// calculator names), the values it was sent with so it can be opened again, and what staff
// saw, as a summary and as label/value pairs for export. Only inputs and results that are on
// the page, and not hidden by a condition, are described.
export function buildCalculatorLineItem(input: {
  calculator: Calculator;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  nickname?: string;
  id?: string;
  now?: string;
}): CalculatorLineItemOutcome {
  const { calculator, values, result, library, formatMoney } = input;
  if (result.quoteCost === undefined) {
    return {
      ok: false,
      error:
        result.missingInputs.length > 0
          ? `Fill in ${describeInputs(result.missingInputs, calculator)} first.`
          : "The calculator can't work out its total yet.",
    };
  }

  const inputsByKey = new Map(calculator.inputs.map((candidate) => [candidate.key, candidate]));
  const isShown = (condition: Condition | undefined) =>
    !condition || evaluateCondition(condition, inputsByKey, values, result.resolvedValues) === true;
  const inputsById = new Map(calculator.inputs.map((candidate) => [candidate.id, candidate]));
  const shownInputs: Array<{ label: string; value: string }> = [];
  const shownResults: Array<{ label: string; value: string; money: boolean }> = [];
  for (const section of calculator.layout) {
    if (!isShown(section.visibleWhen)) continue;
    for (const item of section.items) {
      if (item.type === 'input') {
        const field = inputsById.get(item.inputId);
        if (!field || !isShown(field.visibleWhen)) continue;
        const value = formatInputValue(field, values, result, library);
        if (value !== undefined) shownInputs.push({ label: field.label, value });
      } else if (item.type === 'result') {
        const step = calculator.steps.find((candidate) => candidate.id === item.stepId);
        const stepResult = step ? result.steps[step.id] : undefined;
        if (!step || stepResult?.displayValue === undefined || stepResult.status !== 'ok') continue;
        const { text, unit } = formatStepValue(step, stepResult.displayValue, formatMoney);
        shownResults.push({ label: step.label, value: unit ? `${text} ${unit}` : text, money: step.format === 'money' });
      }
    }
  }
  const measures = shownResults.filter((entry) => !entry.money);
  const inputsSummary = shownInputs.map((entry) => `${entry.label}: ${entry.value}`).join(' · ');

  return {
    ok: true,
    lineItem: {
      id: input.id ?? generateId(),
      calculatorId: calculator.id,
      moduleName: calculator.name,
      nickname: input.nickname?.trim() || undefined,
      fieldValues: {},
      calculatorValues: Object.fromEntries(
        Object.entries(values).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
      ),
      details: [
        ...shownInputs,
        ...shownResults.map(({ label, value }) => ({ label, value })),
      ],
      primarySummary: measures.length > 0 ? measures.slice(0, 3).map((entry) => `${entry.label} ${entry.value}`).join(' · ') : undefined,
      secondarySummary: inputsSummary || undefined,
      fieldSummary: inputsSummary,
      cost: roundMoney(result.quoteCost),
      createdAt: input.now ?? new Date().toISOString(),
    },
  };
}

/** A quote with a line added, or put in place of `replaceId`, and its totals worked out again. */
export function putLineItem(quote: Quote, lineItem: QuoteLineItem, replaceId?: string): Quote {
  const replacing = replaceId !== undefined && quote.lineItems.some((item) => item.id === replaceId);
  const lineItems = replacing
    ? quote.lineItems.map((item) => (item.id === replaceId ? { ...lineItem, id: replaceId } : item))
    : [...quote.lineItems, lineItem];
  return {
    ...quote,
    lineItems,
    ...calculateQuoteTotals({ lineItems, markupPercent: quote.markupPercent, taxRate: quote.taxRate }),
    updatedAt: new Date().toISOString(),
  };
}
