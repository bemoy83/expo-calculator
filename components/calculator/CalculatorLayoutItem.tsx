'use client';

import { evaluateCondition } from '@/lib/calculator/conditions';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorResult,
  CalculatorValue,
  CalculatorValues,
  Condition,
  LayoutItem,
  LayoutSection,
} from '@/lib/calculator/types';
import { CalculatorInputField } from './CalculatorInputField';
import { CalculatorResultItem } from './CalculatorResultItem';

// Shared by the staff view and the builder's layout canvas, so both draw the page the same way.

export const WIDTH_SPAN = { full: 'sm:col-span-6', half: 'sm:col-span-3', third: 'sm:col-span-2' } as const;

/** Grid columns an item takes in its section. */
export function itemSpan(item: LayoutItem): string {
  return item.type === 'input' ? WIDTH_SPAN[item.width ?? 'half'] : WIDTH_SPAN.full;
}

/** Sections holding only results sit in the side column on wide screens. */
export function isResultSection(section: LayoutSection): boolean {
  return (
    section.items.length > 0 &&
    section.items.every((item) => item.type === 'result' || item.type === 'breakdown' || item.type === 'divider')
  );
}

export interface LayoutRenderContext {
  calculator: Calculator;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  /** Inputs to mark "Needed to calculate". */
  needed: Set<string>;
  inputsById: Map<string, CalculatorInput>;
  inputsByKey: Map<string, CalculatorInput>;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  /** Properties read from each material/labor input (see requiredProperties). */
  required: Map<string, string[]>;
}

export function isShown(condition: Condition | undefined, context: LayoutRenderContext): boolean {
  return (
    !condition ||
    evaluateCondition(condition, context.inputsByKey, context.values, context.result.resolvedValues) === true
  );
}

/** One item of a section, or null when it has nothing to show (a hidden or deleted input). */
export function CalculatorLayoutItem({ item, context }: { item: LayoutItem; context: LayoutRenderContext }) {
  switch (item.type) {
    case 'input': {
      const input = context.inputsById.get(item.inputId);
      if (!input || !isShown(input.visibleWhen, context)) return null;
      return (
        <CalculatorInputField
          input={input}
          rawValue={context.values[input.key]}
          resolvedValue={context.result.resolvedValues[input.key]}
          needed={context.needed.has(input.key)}
          library={context.library}
          formatMoney={context.formatMoney}
          onChange={(value) => context.onValueChange(input.key, value)}
          requiredProperties={context.required.get(input.key)}
        />
      );
    }
    case 'result':
    case 'breakdown':
      return (
        <CalculatorResultItem
          item={item}
          calculator={context.calculator}
          result={context.result}
          formatMoney={context.formatMoney}
        />
      );
    case 'text':
      return <p className="text-sm text-ink-body whitespace-pre-line">{item.text}</p>;
    case 'divider':
      return <hr className="border-border" />;
  }
}

export function SectionHeading({ section }: { section: LayoutSection }) {
  if (!section.title && !section.description) return null;
  return (
    <div className="mb-3">
      {section.title && <h2 className="text-sm font-semibold text-ink">{section.title}</h2>}
      {section.description && <p className="mt-0.5 text-xs text-ink-muted">{section.description}</p>}
    </div>
  );
}
