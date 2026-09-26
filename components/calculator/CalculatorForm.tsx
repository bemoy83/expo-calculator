'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { requiredProperties } from '@/lib/calculator/requirements';
import type {
  Calculator,
  CalculatorLibrary,
  CalculatorResult,
  CalculatorValue,
  CalculatorValues,
  LayoutSection,
} from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import {
  CalculatorLayoutItem,
  SectionHeading,
  isResultSection,
  isShown,
  itemSpan,
  type LayoutRenderContext,
} from './CalculatorLayoutItem';

/** What the layout needs to draw a calculator with its values and results. */
export function useLayoutContext({
  calculator,
  values,
  result,
  library,
  formatMoney,
  onValueChange,
}: {
  calculator: Calculator;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
}): LayoutRenderContext {
  const inputsById = useMemo(() => new Map(calculator.inputs.map((input) => [input.id, input])), [calculator.inputs]);
  const inputsByKey = useMemo(() => new Map(calculator.inputs.map((input) => [input.key, input])), [calculator.inputs]);
  const required = useMemo(() => requiredProperties(calculator, library.functions), [calculator, library.functions]);
  const hasValues = Object.values(values).some((value) => value !== undefined);
  // Before anything is typed the results already say what they need, so inputs are only
  // marked "needed" once someone has started filling the calculator in.
  const needed = new Set(hasValues ? result.missingInputs : []);
  return { calculator, values, result, library, formatMoney, needed, inputsById, inputsByKey, onValueChange, required };
}

// A calculator's sections as staff fill them in: inputs in the main column, result-only
// sections beside them on wide screens. On its page each section is a card; inside a quote
// card they are lighter boxes and the side column only appears on very wide screens.
export function CalculatorForm({ context, variant = 'page' }: { context: LayoutRenderContext; variant?: 'page' | 'card' }) {
  const visibleSections = context.calculator.layout.filter((section) => isShown(section.visibleWhen, context));
  const mainSections = visibleSections.filter((section) => !isResultSection(section));
  const sideSections = visibleSections.filter(isResultSection);

  const renderSection = (section: LayoutSection) => {
    const content = (
      <>
        <SectionHeading section={section} />
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-x-4 gap-y-3">
          {section.items.map((item, index) => (
            <div key={`${item.type}-${index}`} className={itemSpan(item)}>
              <CalculatorLayoutItem item={item} context={context} />
            </div>
          ))}
        </div>
      </>
    );
    return variant === 'page' ? (
      <Card key={section.id} className="p-4 sm:p-5">
        {content}
      </Card>
    ) : (
      <div key={section.id} className="rounded-md border border-border p-3 sm:p-4">
        {content}
      </div>
    );
  };

  const hasSide = sideSections.length > 0;
  return (
    <div
      className={cn(
        'grid',
        variant === 'page' ? 'gap-5' : 'gap-3',
        hasSide && (variant === 'page' ? 'lg:grid-cols-[minmax(0,1fr)_340px] items-start' : 'xl:grid-cols-[minmax(0,1fr)_280px] items-start')
      )}
    >
      <div className={cn('min-w-0', variant === 'page' ? 'space-y-5' : 'space-y-3')}>{mainSections.map(renderSection)}</div>
      {hasSide && (
        <div className={cn(variant === 'page' ? 'space-y-5 lg:sticky lg:top-8' : 'space-y-3')}>{sideSections.map(renderSection)}</div>
      )}
    </div>
  );
}
