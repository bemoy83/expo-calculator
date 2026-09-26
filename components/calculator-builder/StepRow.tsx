'use client';

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { keyProblem, suggestKey } from '@/lib/calculator/editing';
import { describeCondition, describeStepProblem, displayUnit, formatStepValue } from '@/lib/calculator/format';
import { callToExpression, expressionToCall } from '@/lib/calculator/step-source';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepFormat, StepResult, StepSource } from '@/lib/calculator/types';
import type { FunctionParamKind } from '@/lib/types';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import { cn } from '@/lib/utils';
import { ConditionEditor } from './ConditionEditor';
import { FunctionCallEditor } from './FunctionCallEditor';
import { StepFormulaEditor } from './StepFormulaEditor';
import { NAME } from '@/lib/formula/identifiers';

const FORMAT_OPTIONS: Array<{ value: StepFormat; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'count', label: 'Count' },
  { value: 'percent', label: 'Percent' },
];

/** Names in "Unknown name" errors that could become inputs. */
export function unknownNameIn(message: string | undefined): string | undefined {
  return message?.match(new RegExp(`^Unknown name "(${NAME})"`))?.[1];
}

interface StepRowProps {
  calculator: Calculator;
  step: CalculatorStep;
  result: StepResult | undefined;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  isCost: boolean;
  isShown: boolean;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  onChange: (step: CalculatorStep) => void;
  onSetCost: (isCost: boolean) => void;
  onSetShown: (shown: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onMoveToPart: (partId: string) => void;
  onRemove: () => void;
  onCreateInput: (key: string) => void;
  /** A new input bound to a parameter of this function-call step. */
  onCreateInputFor: (paramName: string, kind: FunctionParamKind) => void;
}

// One step in a part: collapsed it shows its label, formula and live value; expanded it
// edits them. An error naming an unknown name offers to create that input.
export function StepRow({
  calculator,
  step,
  result,
  library,
  formatMoney,
  isCost,
  isShown,
  isFirst,
  isLast,
  expanded,
  onToggle,
  onChange,
  onSetCost,
  onSetShown,
  onMove,
  onMoveToPart,
  onRemove,
  onCreateInput,
  onCreateInputFor,
}: StepRowProps) {
  const id = useId();
  // The name follows the label until it's edited, or once the step has a real name.
  const [keyTouched, setKeyTouched] = useState(() => !/^step(_\d+)?$/.test(step.key));
  const problem = describeStepProblem(result, calculator);
  const isError = result?.status === 'error';
  const unknown = unknownNameIn(result?.message);
  const nameProblem = keyProblem(calculator, step.key, step.id);
  const expression = step.source.type === 'expression' ? step.source.expression : '';
  const shownFormula =
    step.source.type === 'expression'
      ? expression
      : step.source.functionName
        ? callToExpression(step.source, library.functions)
        : '';
  // What the step was before switching, for when the other form can't be carried over (a
  // formula that isn't one plain call, or a call without a function yet).
  const [other, setOther] = useState<StepSource | null>(null);

  const switchTo = (mode: StepSource['type']) => {
    if (mode === step.source.type) return;
    let next: StepSource;
    if (mode === 'expression') {
      next = shownFormula ? { type: 'expression', expression: shownFormula } : other?.type === 'expression' ? other : { type: 'expression', expression: '' };
    } else {
      next =
        expressionToCall(expression, calculator, library.functions) ??
        (other?.type === 'call' ? other : { type: 'call', functionName: '', args: {} });
    }
    setOther(step.source);
    onChange({ ...step, source: next });
  };

  const value =
    result?.status === 'disabled' ? (
      <span className="text-xs text-ink-muted">Off (0)</span>
    ) : result?.displayValue !== undefined && !problem ? (
      (() => {
        const { text, unit } = formatStepValue(step, result.displayValue, formatMoney);
        return (
          <span className="font-numeric text-sm text-ink tabular-nums">
            {text}
            {unit && <span className="ml-1 text-[0.8em] text-ink-faint">{unit}</span>}
          </span>
        );
      })()
    ) : (
      <span className={cn('text-xs text-right', isError ? 'text-danger' : 'text-ink-muted')}>{problem}</span>
    );

  return (
    <li className={cn('rounded-md border', isError ? 'border-danger-border' : 'border-border', expanded && 'bg-sunken/40')}>
      <div className="flex items-start gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-editor`}
          className="flex-1 min-w-0 flex items-start gap-1.5 text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink truncate">{step.label || 'Unnamed step'}</span>
              {isCost && (
                <span className="shrink-0 rounded-full bg-committed-bg px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-committed">
                  Cost
                </span>
              )}
            </span>
            {!expanded && (
              <code className="block mt-0.5 text-[11.5px] font-numeric text-ink-muted truncate">
                {step.key} = {shownFormula || '…'}
              </code>
            )}
            {!expanded && step.enabledWhen && (
              <span className="block mt-0.5 text-[11px] text-ink-muted truncate">
                Only when {describeCondition(step.enabledWhen, calculator, library)}
              </span>
            )}
          </span>
        </button>
        <div className="shrink-0 max-w-[45%] pt-0.5 text-right">{value}</div>
      </div>

      {unknown && !expanded && (
        <div className="px-2.5 pb-2 -mt-1">
          <Button variant="ghost" size="sm" onClick={() => onCreateInput(unknown)}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Create input “{unknown}”
          </Button>
        </div>
      )}

      {expanded && (
        <div id={`${id}-editor`} className="px-2.5 pb-3 pt-1 space-y-3 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Input
              label="Label"
              value={step.label}
              placeholder="e.g. Stud count"
              onChange={(event) => {
                const label = event.target.value;
                onChange(keyTouched ? { ...step, label } : { ...step, label, key: suggestKey(calculator, label, step.id, 'step') });
              }}
            />
            <Input
              label="Name in formulas"
              value={step.key}
              className="font-numeric"
              error={nameProblem}
              onChange={(event) => {
                setKeyTouched(true);
                onChange({ ...step, key: event.target.value.trim() });
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span id={`${id}-mode`} className="text-xs font-medium text-ink-muted">
                Calculate with
              </span>
              <div role="radiogroup" aria-labelledby={`${id}-mode`} className="flex gap-0.5 p-0.5 rounded-md bg-sunken">
                {(
                  [
                    ['call', 'Function'],
                    ['expression', 'Formula'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={step.source.type === mode}
                    onClick={() => switchTo(mode)}
                    className={cn(
                      'h-6 px-2.5 rounded text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                      step.source.type === mode ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {step.source.type === 'call' ? (
              <FunctionCallEditor
                calculator={calculator}
                step={step}
                source={step.source}
                library={library}
                onChange={(source) => onChange({ ...step, source })}
                onCreateInputFor={onCreateInputFor}
              />
            ) : (
              <StepFormulaEditor
                id={`${id}-formula`}
                calculator={calculator}
                step={step}
                library={library}
                value={expression}
                onChange={(next) => onChange({ ...step, source: { type: 'expression', expression: next } })}
              />
            )}
            {isError && <p className="mt-1 text-xs text-danger">{result?.message}</p>}
            {unknown && (
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => onCreateInput(unknown)}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Create input “{unknown}”
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Shows as"
              value={step.format ?? 'number'}
              options={FORMAT_OPTIONS}
              onChange={(event) => onChange({ ...step, format: event.target.value as StepFormat })}
            />
            {step.format !== 'money' && (
              <Select
                label="Unit"
                value={step.unitSymbol ?? ''}
                options={[
                  { value: '', label: 'No unit' },
                  ...getAllUnitSymbols().map((symbol) => ({ value: symbol, label: displayUnit(symbol) ?? symbol })),
                  ...(step.unitSymbol && !getAllUnitSymbols().includes(step.unitSymbol)
                    ? [{ value: step.unitSymbol, label: `${step.unitSymbol} (label only)` }]
                    : []),
                ]}
                onChange={(event) => {
                  const unitSymbol = event.target.value || undefined;
                  onChange({
                    ...step,
                    unitSymbol,
                    unitCategory: unitSymbol ? getUnitCategory(unitSymbol) : undefined,
                    unitIsLabel: undefined,
                  });
                }}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Checkbox label="This is the part's cost" checked={isCost} onChange={(event) => onSetCost(event.target.checked)} />
            <Checkbox label="Show to staff" checked={isShown} onChange={(event) => onSetShown(event.target.checked)} />
          </div>

          <div>
            <ConditionEditor
              label="Only calculate when…"
              calculator={calculator}
              condition={step.enabledWhen}
              library={library}
              onChange={(enabledWhen) => onChange({ ...step, enabledWhen })}
            />
            {step.enabledWhen && (
              <p className="mt-1 pl-6 text-xs text-ink-muted">Otherwise this step counts as 0, and so do totals that use it.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move step up">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={isLast} aria-label="Move step down">
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {calculator.parts.length > 1 && (
              <div className="w-44">
                <Select
                  aria-label="Move to part"
                  value=""
                  options={[
                    { value: '', label: 'Move to part…' },
                    ...calculator.parts
                      .filter((part) => part.id !== step.partId)
                      .map((part) => ({ value: part.id, label: part.name || 'Unnamed part' })),
                  ]}
                  onChange={(event) => event.target.value && onMoveToPart(event.target.value)}
                />
              </div>
            )}
            <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Delete step
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
