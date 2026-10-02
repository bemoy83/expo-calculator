'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { keyProblem, suggestKey } from '@/lib/calculator/editing';
import { describeCondition, describeStepProblem, describeStepProblemShort, displayUnit, isStepError, formatStepValue } from '@/lib/calculator/format';
import { callToExpression } from '@/lib/calculator/step-source';
import { callSignature, parseCalls, paramAt, type ParamSpec } from '@/lib/calculator/call-context';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepFormat, StepResult } from '@/lib/calculator/types';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import { cn } from '@/lib/utils';
import { ConditionEditor } from './ConditionEditor';
import { StepFormulaEditor } from './StepFormulaEditor';
import { NAME } from '@/lib/formula/identifiers';
import { FormulaText } from '@/components/formula/FormulaText';
import { calculatorFormulaNames, unknownValueNames } from '@/lib/calculator/formula-tokens';

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
  /** Its place in the part, from 1 */
  index: number;
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
  /** A new input named `key`, shaped like the function parameter it's passed for, if any. */
  onCreateInput: (key: string, param?: ParamSpec) => void;
}

/** The parameter of a shared function that `name` is passed as, to shape an input made for it. */
function parameterFor(expression: string, name: string, library: CalculatorLibrary): ParamSpec | undefined {
  for (const call of parseCalls(expression)) {
    const signature = callSignature(call.name, library);
    if (!signature || signature.builtIn) continue;
    const index = call.args.findIndex((arg) => arg.text === name);
    const param = index >= 0 ? paramAt(signature, index) : undefined;
    if (param) return param;
  }
  return undefined;
}

// One step in a part: collapsed it shows its label, formula and live value; expanded it
// edits them. An error naming an unknown name offers to create that input.
export function StepRow({
  calculator,
  step,
  index,
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
}: StepRowProps) {
  const id = useId();
  // The name follows the label until it's edited, or once the step has a real name.
  const [keyTouched, setKeyTouched] = useState(() => !/^step(_\d+)?$/.test(step.key));
  const problem = describeStepProblem(result, calculator);
  const isError = isStepError(result);
  const isIncomplete = result?.status === 'error' && !!result.incomplete;
  const unknown = unknownNameIn(result?.message);
  const nameProblem = keyProblem(calculator, step.key, step.id);
  const formulaNames = useMemo(() => calculatorFormulaNames(calculator, library), [calculator, library]);
  // Steps are edited as formulas; a call step that hasn't been converted yet reads as its formula.
  const expression =
    step.source.type === 'expression' ? step.source.expression : step.source.functionName ? callToExpression(step.source, library.functions) : '';
  // Names the formula uses that nothing matches, once the error has settled, each offered as a new input.
  const unknownNames = useMemo(() => {
    if (!unknown) return [];
    const names = unknownValueNames(expression, formulaNames);
    return names.length > 0 ? names : [unknown];
  }, [unknown, expression, formulaNames]);

  const value =
    result?.status === 'disabled' ? (
      <span className="text-xs text-ink-muted">Off (0)</span>
    ) : result?.displayValue !== undefined && !problem ? (
      (() => {
        const { text, unit } = formatStepValue(step, result.displayValue, formatMoney);
        return (
          <span className={cn('font-numeric text-sm text-ink tabular-nums whitespace-nowrap', isCost && 'font-semibold')}>
            {text}
            {unit && <span className="ml-1 text-[0.8em] text-ink-faint">{unit}</span>}
          </span>
        );
      })()
    ) : (
      <span title={isError ? result?.message : undefined} className={cn('text-xs text-right', isError ? 'text-danger' : isIncomplete ? 'text-draft' : 'text-ink-muted')}>
        {describeStepProblemShort(result, calculator)}
      </span>
    );

  return (
    <li
      className={cn(
        'border transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        // A closed step is a list row (hairline, surface fill on hover); the open one is a card
        // with the accent ring; a real error keeps its red border either way.
        expanded
          ? cn('my-1 rounded-row bg-surface shadow-focus', isError ? 'border-danger' : 'border-accent')
          : isError
            ? 'my-0.5 rounded-row border-danger-border'
            : 'border-transparent border-b-border hover:bg-surface hover:rounded-md'
      )}
    >
      {/* Closed (mockup 4b): index · label · formula · value. Open, the formula column says how it's used. */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-editor`}
          className="flex-1 min-w-0 grid grid-cols-[24px_minmax(0,1fr)] md:grid-cols-[24px_150px_minmax(0,1fr)] gap-x-3 gap-y-1 items-baseline text-left text-sm rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <span className={cn('font-numeric text-xs', expanded ? 'text-accent font-semibold' : 'text-ink-faint')}>{index}</span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-ink truncate">{step.label || 'Unnamed step'}</span>
            {isCost && (
              <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[.06em] text-ink">
                Cost
              </span>
            )}
          </span>
          <span className="col-start-2 md:col-start-auto min-w-0">
            {expanded ? (
              <span className="text-xs text-ink-muted">{isShown ? 'Shown to staff' : 'Not shown to staff'}</span>
            ) : (
              <span className="block font-numeric text-[13px] text-ink-muted line-clamp-2 break-all">
                <span className="text-token-result">{step.key}</span> ={' '}
                {expression ? <FormulaText expression={expression} names={formulaNames} /> : '…'}
              </span>
            )}
            {!expanded && step.enabledWhen && (
              <span className="block mt-0.5 text-[11px] text-ink-muted truncate">
                Only when {describeCondition(step.enabledWhen, calculator, library)}
              </span>
            )}
          </span>
        </button>
        <div className="shrink-0 w-[90px] max-w-[40%] text-right">{value}</div>
      </div>

      {unknownNames.length > 0 && !expanded && (
        <div className="px-3.5 md:pl-[50px] pb-2 -mt-1.5 flex flex-wrap gap-x-2">
          {unknownNames.map((name) => (
            <Button key={name} variant="ghost" size="sm" onClick={() => onCreateInput(name, parameterFor(expression, name, library))}>
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Create input “{name}”
            </Button>
          ))}
        </div>
      )}

      {expanded && (
        <div id={`${id}-editor`} className="pl-3.5 md:pl-[50px] pr-3.5 pb-4 pt-0.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <StepFormulaEditor
              id={`${id}-formula`}
              label="Formula"
              calculator={calculator}
              step={step}
              library={library}
              value={expression}
              onChange={(next) => onChange({ ...step, source: { type: 'expression', expression: next } })}
            />
            {isError && <p className="mt-1 text-xs text-danger">{result?.message}</p>}
            {isIncomplete && result?.message && <p className="mt-1 text-xs text-ink-muted">{result.message}</p>}
            {unknownNames.map((name) => (
              <Button key={name} variant="ghost" size="sm" className="mt-1 mr-2" onClick={() => onCreateInput(name, parameterFor(expression, name, library))}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Create input “{name}”
              </Button>
            ))}
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
