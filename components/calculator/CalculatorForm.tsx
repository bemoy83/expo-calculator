'use client';

import { useMemo } from 'react';
import type { FieldSize } from '@/components/ui/field-styles';
import { requiredProperties } from '@/lib/calculator/requirements';
import type {
  Calculator,
  CalculatorLibrary,
  CalculatorResult,
  CalculatorValue,
  CalculatorValues,
  LayoutItem,
  LayoutSection,
} from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import {
  CalculatorLayoutItem,
  SectionHeading,
  WIDTH_SPAN,
  isResultSection,
  isShown,
  itemSpan,
  type LayoutRenderContext,
} from './CalculatorLayoutItem';
import { EditableSection } from './LayoutEditing';

/** What the layout needs to draw a calculator with its values and results. */
export function useLayoutContext({
  calculator,
  values,
  result,
  library,
  formatMoney,
  onValueChange,
  fieldSize,
}: {
  calculator: Calculator;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  fieldSize?: FieldSize;
}): LayoutRenderContext {
  const inputsById = useMemo(() => new Map(calculator.inputs.map((input) => [input.id, input])), [calculator.inputs]);
  const inputsByKey = useMemo(() => new Map(calculator.inputs.map((input) => [input.key, input])), [calculator.inputs]);
  const required = useMemo(() => requiredProperties(calculator, library.functions), [calculator, library.functions]);
  const hasValues = Object.values(values).some((value) => value !== undefined);
  // Before anything is typed the results already say what they need, so inputs are only
  // marked "needed" once someone has started filling the calculator in.
  const needed = new Set(hasValues ? result.missingInputs : []);
  return { calculator, values, result, library, formatMoney, needed, inputsById, inputsByKey, onValueChange, required, fieldSize };
}

// The quick view is narrow (420px), so thirds widen to halves there.
function spanFor(item: LayoutItem, context: LayoutRenderContext): string {
  const span = itemSpan(item);
  return context.fieldSize === 'compact' && span === WIDTH_SPAN.third ? WIDTH_SPAN.half : span;
}

const SECTION_GRID = 'grid grid-cols-1 sm:grid-cols-6 gap-x-[18px] gap-y-4';

function LayoutSectionView({ section, context }: { section: LayoutSection; context: LayoutRenderContext }) {
  if (context.editing) {
    return (
      <EditableSection
        section={section}
        context={context}
        editing={context.editing}
        spanFor={(item) => spanFor(item, context)}
        gridClassName={SECTION_GRID}
      />
    );
  }
  return (
    <section>
      <SectionHeading section={section} />
      <div className={SECTION_GRID}>
        {section.items.map((item, index) => (
          <div key={`${item.type}-${index}`} className={spanFor(item, context)}>
            <CalculatorLayoutItem item={item} context={context} />
          </div>
        ))}
      </div>
    </section>
  );
}

function visibleSections(context: LayoutRenderContext) {
  // Editing draws every section, so a conditional one can still be selected.
  return context.editing ? context.calculator.layout : context.calculator.layout.filter((section) => isShown(section.visibleWhen, context));
}

/** Whether the layout has sections holding only results, which a live pane can show. */
export function hasResultSections(context: LayoutRenderContext): boolean {
  return visibleSections(context).some(isResultSection);
}

// A calculator's sections as staff fill them in (mockups 4a, 6b, 1a): each section under a mono
// eyebrow, its fields on a six-column grid. With results="pane" the sections holding only
// results are left out, for the page's live pane (CalculatorResultSections) to show.
export function CalculatorForm({
  context,
  results = 'inline',
  className,
}: {
  context: LayoutRenderContext;
  results?: 'inline' | 'pane';
  className?: string;
}) {
  const sections = visibleSections(context).filter((section) => results === 'inline' || !isResultSection(section));
  return (
    <div className={cn('flex flex-col gap-7', className)}>
      {sections.map((section) => (
        <LayoutSectionView key={section.id} section={section} context={context} />
      ))}
    </div>
  );
}

/** The sections holding only results, for a live pane. */
export function CalculatorResultSections({ context, className }: { context: LayoutRenderContext; className?: string }) {
  const sections = visibleSections(context).filter(isResultSection);
  if (sections.length === 0) return null;
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {sections.map((section) => (
        <LayoutSectionView key={section.id} section={section} context={context} />
      ))}
    </div>
  );
}
