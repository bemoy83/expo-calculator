'use client';

import { useId, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { keyProblem, suggestKey } from '@/lib/calculator/editing';
import { describeCondition, describeStepProblem, describeStepProblemShort, isStepError, formatStepValue } from '@/lib/calculator/format';
import { parameterFor, type ParamSpec } from '@/lib/calculator/call-context';
import { analyzeStepFormula, stepDiagnostics } from '@/lib/calculator/step-analysis';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepResult } from '@/lib/calculator/types';
import { plainSyntaxMessage } from '@/lib/formula/diagnostics';
import { IssueLine, PinnedNotes } from '@/components/formula/IssueMarker';
import { FormulaText } from '@/components/formula/FormulaText';
import { cn } from '@/lib/utils';
import { ConditionRow } from './ConditionEditor';
import { StepFormatControls } from './StepFormatControls';
import { StepFormulaEditor } from './StepFormulaEditor';
import { StepStrip } from './StepStrip';

interface StepRowProps {
  calculator: Calculator;
  step: CalculatorStep;
  /** Its place in the part, from 1 */
  index: number;
  result: StepResult | undefined;
  /** Every step's result, for the formula's hover cards */
  stepResults: Record<string, StepResult>;
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

// One step in a part: collapsed it shows its label, formula and live value; expanded it
// edits them. An error naming an unknown name offers to create that input.
export function StepRow({
  calculator,
  step,
  index,
  result,
  stepResults,
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
  const nameProblem = keyProblem(calculator, step.key, step.id);
  // What the formula has to say about itself (see lib/calculator/step-analysis).
  const analysis = useMemo(() => analyzeStepFormula({ step, result, calculator, library }), [step, result, calculator, library]);
  const { expression, formulaNames, unknownNames, issues, syntaxRange, unitAnalysis } = analysis;
  // An error that is only a name nothing matches yet is "unresolved" (amber), not a mistake (red).
  const unresolvedOnly = isError && !issues.some((issue) => issue.level === 'broken');
  // The same problems, pinned to the text they're about: hover one for its message and fix.
  const diagnostics = stepDiagnostics(analysis, library, onCreateInput);

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
        className={cn(
          'text-xs text-right',
          unresolvedOnly ? 'text-draft' : isError ? 'text-danger' : isIncomplete ? 'text-draft' : 'text-ink-muted'
        )}
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
          ? cn(
              'my-1 overflow-hidden rounded-row bg-surface shadow-focus',
              unresolvedOnly ? 'border-draft' : isError ? 'border-danger' : 'border-accent'
            )
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
            <span
              className={cn('block font-numeric text-[13px] text-ink-muted', expanded ? 'step-formula truncate' : 'line-clamp-2 break-all')}
            >
              <span className="text-token-result">{step.key}</span> ={' '}
              {expression ? <FormulaText expression={expression} names={formulaNames} markUnresolved /> : '…'}
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
                  diagnostics={diagnostics}
                  notes={unitAnalysis.notes}
                  results={stepResults}
                  formatMoney={formatMoney}
                  onChange={(next) => onChange({ ...step, source: { type: 'expression', expression: next } })}
                />
                {/* Heads-ups are pinned to the text, so with a pointer they're one line: hover the dotted underline. */}
                <PinnedNotes messages={issues.filter((issue) => issue.level === 'heads-up').map((issue) => issue.message)} className="mt-1" />
                {issues.filter((issue) => issue.level !== 'heads-up').map((issue) =>
                  issue.name ? (
                    <div key={`name-${issue.name}`} className="mt-1 flex flex-wrap items-center gap-x-2">
                      <IssueLine level="unresolved">{issue.message}</IssueLine>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCreateInput(issue.name!, parameterFor(expression, issue.name!, library))}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Create input “{issue.name}”
                      </Button>
                    </div>
                  ) : (
                    <IssueLine key={`${issue.level}-${issue.message}`} level={issue.level} className="mt-1">
                      {issue.level === 'broken' && syntaxRange ? plainSyntaxMessage(issue.message) : issue.message}
                    </IssueLine>
                  )
                )}
                {isIncomplete && result?.message && <p className="mt-1 text-xs text-ink-muted">{result.message}</p>}
              </div>

              <StepFormatControls id={id} step={step} onChange={onChange} />
            </div>

            <StepStrip
              calculator={calculator}
              library={library}
              step={step}
              isCost={isCost}
              isShown={isShown}
              isFirst={isFirst}
              isLast={isLast}
              onChange={onChange}
              onSetCost={onSetCost}
              onSetShown={onSetShown}
              onMove={onMove}
              onMoveToPart={onMoveToPart}
              onRemove={onRemove}
            />
          </div>

          {step.enabledWhen && (
            <ConditionRow
              calculator={calculator}
              condition={step.enabledWhen}
              library={library}
              onChange={(enabledWhen) => onChange({ ...step, enabledWhen })}
            />
          )}
        </div>
      )}
    </li>
  );
}
