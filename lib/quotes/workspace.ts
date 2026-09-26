import { calculateQuoteTotals } from '../calculations/money';
import { evaluateCalculator } from '../calculator/evaluate';
import type { Calculator, CalculatorLibrary } from '../calculator/types';
import type { Quote, QuoteLineItem } from '../types';
import { buildCalculatorLineItem } from './calculator-line-item';
import { normalizeNickname } from './nickname';

// Editing a quote as a workspace of calculator cards: adding a calculator, duplicating a
// card, moving and removing cards. Each returns a new quote with its totals worked out.

/** What a card is called: its nickname, else its calculator's name. */
export function lineTitle(line: Pick<QuoteLineItem, 'moduleName' | 'nickname'>): string {
  return normalizeNickname(line.nickname) ?? line.moduleName;
}

/**
 * The calculator's name to show beside a card's title, when the title doesn't already say it
 * ("North wall" → "Wood wall"; "Wood wall 2" → nothing).
 */
export function lineCalculatorName(line: Pick<QuoteLineItem, 'moduleName' | 'nickname'>): string | undefined {
  const nickname = normalizeNickname(line.nickname);
  if (!nickname) return undefined;
  return nickname.toLowerCase().startsWith(line.moduleName.trim().toLowerCase()) ? undefined : line.moduleName;
}

/** The next free numbered name for a copy: "Wood wall" → "Wood wall 2", "Wall 2" → "Wall 3". */
export function copyName(line: QuoteLineItem, lines: QuoteLineItem[]): string {
  const title = lineTitle(line);
  const match = title.match(/^(.*\S)\s+(\d+)$/);
  const stem = match ? match[1] : title;
  const taken = new Set(lines.map((candidate) => lineTitle(candidate).toLowerCase()));
  let number = match ? Number(match[2]) + 1 : 2;
  while (taken.has(`${stem} ${number}`.toLowerCase())) number += 1;
  return `${stem} ${number}`;
}

function withLines(quote: Quote, lineItems: QuoteLineItem[]): Quote {
  return {
    ...quote,
    lineItems,
    ...calculateQuoteTotals({ lineItems, markupPercent: quote.markupPercent, taxRate: quote.taxRate }),
    updatedAt: new Date().toISOString(),
  };
}

/** Puts a line at `index` (the end when left out or out of range). */
export function insertLine(quote: Quote, line: QuoteLineItem, index?: number): Quote {
  const lines = [...quote.lineItems];
  const at = index === undefined || index < 0 || index > lines.length ? lines.length : index;
  lines.splice(at, 0, line);
  return withLines(quote, lines);
}

/**
 * A copy of a card, with its values and the next numbered name, after the cards from the same
 * calculator that follow it: duplicating Wall 1 twice gives Wall 1, Wall 2, Wall 3.
 */
export function duplicateLine(quote: Quote, lineId: string, id: string, now: string): { quote: Quote; copy?: QuoteLineItem } {
  const index = quote.lineItems.findIndex((line) => line.id === lineId);
  if (index === -1) return { quote };
  const original = quote.lineItems[index];
  const copy: QuoteLineItem = {
    ...original,
    id,
    nickname: copyName(original, quote.lineItems),
    calculatorValues: original.calculatorValues ? { ...original.calculatorValues } : undefined,
    details: original.details?.map((detail) => ({ ...detail })),
    createdAt: now,
  };
  let last = index;
  while (last + 1 < quote.lineItems.length && quote.lineItems[last + 1].calculatorId === original.calculatorId) last += 1;
  return { quote: insertLine(quote, copy, last + 1), copy };
}

/** Moves a card one place up (-1) or down (1). */
export function moveLine(quote: Quote, lineId: string, direction: -1 | 1): Quote {
  const index = quote.lineItems.findIndex((line) => line.id === lineId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= quote.lineItems.length) return quote;
  const lines = [...quote.lineItems];
  [lines[index], lines[target]] = [lines[target], lines[index]];
  return withLines(quote, lines);
}

/** Removes a card, saying where it was so it can be put back. */
export function removeLine(quote: Quote, lineId: string): { quote: Quote; removed?: { line: QuoteLineItem; index: number } } {
  const index = quote.lineItems.findIndex((line) => line.id === lineId);
  if (index === -1) return { quote };
  return {
    quote: withLines(quote, quote.lineItems.filter((line) => line.id !== lineId)),
    removed: { line: quote.lineItems[index], index },
  };
}

/** A new card for a calculator, at its defaults: unfinished until it can calculate. */
export function newCalculatorLine(input: {
  calculator: Calculator;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  id: string;
  now: string;
}): QuoteLineItem {
  const { calculator, library, formatMoney, id, now } = input;
  const outcome = buildCalculatorLineItem({
    calculator,
    values: {},
    result: evaluateCalculator(calculator, {}, library),
    library,
    formatMoney,
    id,
    now,
    allowUnfinished: true,
  });
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.lineItem;
}

/** Calculators grouped by category, alphabetically, with uncategorised ones last as "Other". */
export function groupCalculatorsByCategory(calculators: Calculator[]): Array<{ category: string; items: Calculator[] }> {
  const groups = new Map<string, Calculator[]>();
  for (const calculator of calculators) {
    const category = calculator.category?.trim() || '';
    groups.set(category, [...(groups.get(category) ?? []), calculator]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([category, items]) => ({
      category: category || 'Other',
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
