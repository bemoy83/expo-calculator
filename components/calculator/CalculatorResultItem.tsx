'use client';

import { describeStepProblem, formatStepValue } from '@/lib/calculator/format';
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
        'font-numeric text-ink tabular-nums',
        size === 'headline' ? 'text-3xl font-semibold tracking-tight' : size === 'card' ? 'text-xl font-semibold' : 'text-sm'
      )}
    >
      {text}
      {unit && <span className="ml-1 text-ink-faint font-normal text-[0.8em]">{unit}</span>}
    </span>
  );
}

// A result or breakdown placed in the layout. Results without a value say why instead
// ("Needs Height", "Waiting on Framing", or the error).
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
    const parts = calculator.parts.filter((part) => item.partIds.includes(part.id));
    return (
      <div>
        {item.title && <p className="mb-2 text-xs font-medium text-ink-muted">{item.title}</p>}
        <dl className="divide-y divide-border">
          {parts.map((part) => {
            const cost = result.parts[part.id]?.cost;
            const costStep = calculator.steps.find((step) => step.id === part.costStepId);
            return (
              <div key={part.id} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-sm text-ink-body">{part.name}</dt>
                <dd className="text-right">
                  {cost !== undefined ? (
                    <span className="font-numeric text-sm text-ink tabular-nums">{formatMoney(cost)}</span>
                  ) : costStep ? (
                    <StepValue step={costStep} calculator={calculator} result={result} formatMoney={formatMoney} size="row" />
                  ) : (
                    <span className="text-xs text-ink-muted">No cost</span>
                  )}
                </dd>
              </div>
            );
          })}
          <div className="flex items-baseline justify-between gap-3 pt-2.5">
            <dt className="text-sm font-semibold text-ink">Total</dt>
            <dd className="font-numeric text-base font-semibold text-ink tabular-nums">
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
        <p className="text-xs font-medium text-ink-muted">{step.label}</p>
        <div className="mt-1" aria-live="polite">
          <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="headline" />
        </div>
      </div>
    );
  }

  if (item.style === 'card') {
    return (
      <div className="rounded-md border border-border bg-sunken px-3 py-2.5">
        <p className="text-xs font-medium text-ink-muted">{step.label}</p>
        <div className="mt-0.5">
          <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-body">{step.label}</span>
      <span className="text-right">
        <StepValue step={step} calculator={calculator} result={result} formatMoney={formatMoney} size="row" />
      </span>
    </div>
  );
}
