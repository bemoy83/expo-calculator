'use client';

import { costedParts } from '@/lib/calculator/editing';
import { describeStepProblem, formatStepValue, stepDisplayLabel } from '@/lib/calculator/format';
import type { Calculator, CalculatorResult, CalculatorStep, LayoutItem } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';

type FormatMoney = (amount: number) => string;

function StepValue({
  step,
  calculator,
  result,
  formatMoney,
  size,
}: {
  step: CalculatorStep;
  calculator: Calculator;
  result: CalculatorResult;
  formatMoney: FormatMoney;
  size: 'row' | 'card' | 'headline';
}) {
  const stepResult = result.steps[step.id];
  if (stepResult?.status === 'disabled') {
    return <span className="text-sm text-ink-muted">Not included</span>;
  }
  const problem = describeStepProblem(stepResult, calculator);
  if (problem || stepResult?.displayValue === undefined) {
    return (
      <span className={cn('text-xs', stepResult?.status === 'error' ? 'text-danger' : 'text-ink-muted')}>
        {problem ?? "Can't calculate"}
      </span>
    );
  }
  const { text, unit } = formatStepValue(step, stepResult.displayValue, formatMoney);
  return (
    <span
      className={cn(
        'font-numeric text-ink tabular-nums whitespace-nowrap',
        size === 'headline'
          ? 'text-[32px] font-semibold tracking-[-.03em]'
          : size === 'card'
            ? 'text-[22px] font-semibold tracking-[-.02em]'
            : 'text-[15px]'
      )}
    >
      {text}
      {unit && <span className="text-ink-faint font-normal text-[0.8em]"> {unit}</span>}
    </span>
  );
}

// A result or breakdown placed in the layout. Results without a value say why instead
// ("Needs Height", "Waiting on Framing", or the error). A breakdown lists the parts that have
// a cost, and shows nothing when none has.

export function CalculatorResultItem({
  item,
  calculator,
  result,
  formatMoney,
}: {
  item: Extract<LayoutItem, { type: 'result' } | { type: 'breakdown' }>;
  calculator: Calculator;
  result: CalculatorResult;
  formatMoney: FormatMoney;
}) {
  if (item.type === 'breakdown') {
    const parts = costedParts(calculator, item.partIds);
    if (parts.length === 0) return null;
    return (
      <div>
        {item.title && <p className="mb-2 text-xs text-ink-muted">{item.title}</p>}
        <dl className="flex flex-col gap-3">
          {parts.map((part) => {
            const cost = result.parts[part.id]?.cost;
            const costStep = calculator.steps.find((step) => step.id === part.costStepId);
            return (
              <div key={part.id} className="flex items-baseline gap-2.5 text-[15px]">
                <dt className="min-w-0 text-ink">{part.name}</dt>
                <span aria-hidden="true" className="flex-1 border-b border-dotted border-border-strong" />
                <dd className="text-right">
                  {cost !== undefined ? (
                    <span className="font-numeric text-ink tabular-nums whitespace-nowrap">{formatMoney(cost)}</span>
                  ) : (
                    costStep && (
                      <StepValue step={costStep} calculator={calculator} result={result} formatMoney={formatMoney} size="row" />
                    )
                  )}
                </dd>
              </div>
            );
          })}
          <div className="flex items-baseline gap-2.5 pt-1">
            <dt className="text-[15px] font-semibold text-ink">Total</dt>
            <span className="flex-1" />
            <dd className="font-numeric text-lg font-semibold text-ink tabular-nums">
              {result.total !== undefined ? formatMoney(result.total) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  const step = calculator.steps.find((candidate) => candidate.id === item.stepId);
  if (!step) return null;

  if (item.style === 'headline') {
    return (
      <div className="pt-1">
        <p className="text-[13px] text-ink-muted">{stepDisplayLabel(step)}</p>
        <div className="mt-1" aria-live="polite">
          <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="headline" />
        </div>
      </div>
    );
  }

  if (item.style === 'card') {
    return (
      <div className="rounded-row border border-border bg-surface px-3.5 py-3">
        <p className="text-xs text-ink-muted">{stepDisplayLabel(step)}</p>
        <div className="mt-0.5">
          <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="card" />
        </div>
      </div>
    );
  }

  // A result line (mockup 4a): label, dotted leader, value.
  return (
    <div className="flex items-baseline gap-2.5 py-1 text-[15px]">
      <span className="min-w-0 text-ink">{stepDisplayLabel(step)}</span>
      <span aria-hidden="true" className="flex-1 min-w-4 border-b border-dotted border-border-strong" />
      <span className="text-right">
        <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="row" />
      </span>
    </div>
  );
}
