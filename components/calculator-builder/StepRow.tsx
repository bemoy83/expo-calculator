'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Banknote, ChevronDown, Hash, ListOrdered, Percent, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Segmented } from '@/components/ui/Segmented';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { keyProblem, suggestKey } from '@/lib/calculator/editing';
import { describeCondition, describeStepProblem, describeStepProblemShort, displayUnit, isStepError, formatStepValue } from '@/lib/calculator/format';
import { callToExpression } from '@/lib/calculator/step-source';
import { callSignature, parseCalls, paramAt, type ParamSpec } from '@/lib/calculator/call-context';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepFormat, StepResult } from '@/lib/calculator/types';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import { cn } from '@/lib/utils';
import { ConditionRow, NO_CONDITION_HINT, canStartCondition, startCondition } from './ConditionEditor';
import { StepFormulaEditor } from './StepFormulaEditor';
import { useCallProblems } from './CallProblems';
import { classifyStepIssues, unknownNameIn } from '@/lib/calculator/step-issues';
import { IssueLine } from '@/components/formula/IssueMarker';
import { NAME } from '@/lib/formula/identifiers';
import { FormulaText } from '@/components/formula/FormulaText';
import { calculatorFormulaNames, unknownValueNames } from '@/lib/calculator/formula-tokens';

// An icon per format; the chosen one also shows its name, so the control fits any width.
const FORMATS: Array<{ value: StepFormat; label: string; Icon: typeof Hash }> = [
  { value: 'number', label: 'Number', Icon: Hash },
  { value: 'money', label: 'Money', Icon: Banknote },
  { value: 'count', label: 'Count', Icon: ListOrdered },
  { value: 'percent', label: 'Percent', Icon: Percent },
];

function formatOptions(selected: StepFormat) {
  return FORMATS.map(({ value, label, Icon }) => ({
    value,
    title: label,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span className={value === selected ? undefined : 'sr-only'}>{label}</span>
      </span>
    ),
  }));
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

/** "Move to part ▾": a quiet 32px button over a transparent native select. */
function MoveToPart({ calculator, step, onMoveToPart }: { calculator: Calculator; step: CalculatorStep; onMoveToPart: (partId: string) => void }) {
  return (
    <label className="relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-3 text-xs text-ink-muted transition-colors duration-150 hover:text-ink focus-within:ring-2 focus-within:ring-action">
      Move to part
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      <select
        aria-label="Move to part"
        value=""
        onChange={(event) => event.target.value && onMoveToPart(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        <option value="">Move to part…</option>
        {calculator.parts
          .filter((part) => part.id !== step.partId)
          .map((part) => (
            <option key={part.id} value={part.id}>
              {part.name || 'Unnamed part'}
            </option>
          ))}
      </select>
    </label>
  );
}

/** A switch row in the "In this part" strip: label and a one-line consequence, the whole row the hit target. */
function StripToggle({
  label,
  note,
  checked,
  disabled,
  title,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className={cn(
        'step-toggle -mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-hover',
        'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="step-note block truncate text-xs text-ink-muted">{note}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-[22px] w-[38px] flex-none rounded-full transition-colors duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
          checked ? 'bg-accent' : 'bg-border-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-4 w-4 rounded-full transition-[left] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
            checked ? 'left-[19px] bg-accent-ink' : 'left-[3px] bg-surface'
          )}
        />
      </span>
    </button>
  );
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

  // What the formula has to say about itself, in the same levels as a function's formula.
  const callProblems = useCallProblems(expression, calculator, library);
  const issues = classifyStepIssues({ result, unknownNames, callProblems });
  // An error that is only a name nothing matches yet is "unresolved" (amber), not a mistake (red).
  const unresolvedOnly = isError && !issues.some((issue) => issue.level === 'broken');

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
      <span
        title={isError ? result?.message : undefined}
        className={cn('text-xs text-right', unresolvedOnly ? 'text-draft' : isError ? 'text-danger' : isIncomplete ? 'text-draft' : 'text-ink-muted')}
      >
        {unresolvedOnly ? 'Unresolved' : describeStepProblemShort(result, calculator)}
      </span>
    );

  return (
    <li
      className={cn(
        'step-card border transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
        // A closed step is a list row (hairline, surface fill on hover); the open one is a card
        // with the accent ring; a real error keeps its red border either way.
        expanded
          ? cn('my-1 overflow-hidden rounded-row bg-surface shadow-focus', unresolvedOnly ? 'border-draft' : isError ? 'border-danger' : 'border-accent')
          : isError
            ? cn('my-0.5 rounded-row', unresolvedOnly ? 'border-draft-border' : 'border-danger-border')
            : 'border-transparent border-b-border hover:bg-surface hover:rounded-md'
      )}
    >
      {/* Closed (mockup 4b): index · label · formula · value. Open, the formula column says how it's used. */}
      <div className="flex items-baseline gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-editor`}
          className="flex-1 min-w-0 grid step-summary grid-cols-[24px_150px_minmax(0,1fr)] gap-x-3 gap-y-1 items-baseline text-left text-sm rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
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
          <span className="min-w-0">
            <span className={cn('block font-numeric text-[13px] text-ink-muted', expanded ? 'step-formula truncate' : 'line-clamp-2 break-all')}>
              <span className="text-token-result">{step.key}</span> ={' '}
              {expression ? <FormulaText expression={expression} names={formulaNames} /> : '…'}
            </span>
            {!expanded && step.enabledWhen && (
              <span className="block mt-0.5 text-[11px] text-ink-muted truncate">
                Only when {describeCondition(step.enabledWhen, calculator, library)}
              </span>
            )}
          </span>
        </button>
        <div className="min-w-[90px] flex-none whitespace-nowrap text-right">{value}</div>
      </div>

      {unknownNames.length > 0 && !expanded && (
        <div className="px-4 md:pl-[52px] pb-2 -mt-1.5 flex flex-wrap gap-x-2">
          {unknownNames.map((name) => (
            <Button key={name} variant="ghost" size="sm" onClick={() => onCreateInput(name, parameterFor(expression, name, library))}>
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Create input “{name}”
            </Button>
          ))}
        </div>
      )}

      {expanded && (
        <div id={`${id}-editor`} className="border-t border-border">
          <div className="step-body">
            <div className="flex min-w-0 flex-col gap-3.5 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  className="font-numeric text-token-result"
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
                {issues.map((issue) =>
                  issue.name ? (
                    <div key={`name-${issue.name}`} className="mt-1 flex flex-wrap items-center gap-x-2">
                      <IssueLine level="unresolved">{issue.message}</IssueLine>
                      <Button variant="ghost" size="sm" onClick={() => onCreateInput(issue.name!, parameterFor(expression, issue.name!, library))}>
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Create input “{issue.name}”
                      </Button>
                    </div>
                  ) : (
                    <IssueLine key={`${issue.level}-${issue.message}`} level={issue.level} className="mt-1">
                      {issue.message}
                    </IssueLine>
                  )
                )}
                {isIncomplete && result?.message && <p className="mt-1 text-xs text-ink-muted">{result.message}</p>}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <div>
                  <span id={`${id}-format`} className="mb-1.5 block text-xs text-ink-muted">
                    Shows as
                  </span>
                  <Segmented
                    block
                    aria-labelledby={`${id}-format`}
                    className="!h-[42px]"
                    options={formatOptions(step.format ?? 'number')}
                    value={step.format ?? 'number'}
                    onChange={(format) => onChange({ ...step, format })}
                  />
                </div>
                {/* Money and percent fix the unit; the field stays so the row keeps its shape. */}
                {step.format === 'money' || step.format === 'percent' ? (
                  <Select label="Unit" disabled value="" options={[{ value: '', label: step.format === 'money' ? 'kr' : '%' }]} />
                ) : (
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
            </div>

            <div className="step-strip bg-panel">
              <Eyebrow className="step-eyebrow mb-1 !text-[11px]">In this part</Eyebrow>
              <div className="step-toggles">
                <StripToggle label="Part's cost" note="Adds to the total" checked={isCost} onChange={onSetCost} />
                <StripToggle label="Show to staff" note="A result row on the form" checked={isShown} onChange={onSetShown} />
                <StripToggle
                  label="Only when…"
                  note={step.enabledWhen ? describeCondition(step.enabledWhen, calculator, library) : 'Always'}
                  checked={!!step.enabledWhen}
                  disabled={!step.enabledWhen && !canStartCondition(calculator)}
                  title={!step.enabledWhen && !canStartCondition(calculator) ? NO_CONDITION_HINT : undefined}
                  onChange={(on) => onChange({ ...step, enabledWhen: on ? startCondition(calculator, library) : undefined })}
                />
              </div>
              <div className="step-foot">
                <IconButton label="Move step up" icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />} onClick={() => onMove(-1)} disabled={isFirst} />
                <IconButton label="Move step down" icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />} onClick={() => onMove(1)} disabled={isLast} />
                {calculator.parts.length > 1 && <MoveToPart calculator={calculator} step={step} onMoveToPart={onMoveToPart} />}
                <Button variant="danger" size="sm" className="ml-auto" onClick={onRemove}>
                  <span className="step-wide-only">Delete</span>
                  <span className="step-narrow-only">Delete step</span>
                </Button>
              </div>
            </div>
          </div>

          {step.enabledWhen && (
            <ConditionRow calculator={calculator} condition={step.enabledWhen} library={library} onChange={(enabledWhen) => onChange({ ...step, enabledWhen })} />
          )}
        </div>
      )}
    </li>
  );
}
