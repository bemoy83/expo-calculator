'use client';

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionBar } from '@/components/module-editor/SectionBar';
import { CalculatorInputField } from '@/components/calculator/CalculatorInputField';
import { describeInputs, describeStepProblem, formatStepValue } from '@/lib/calculator/format';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorPart,
  CalculatorResult,
  CalculatorStep,
  CalculatorValue,
  CalculatorValues,
} from '@/lib/calculator/types';
import type { FunctionParamKind } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StepRow } from './StepRow';

type FormatMoney = (amount: number) => string;

/** A live input with a button to edit its definition. */
export function BuilderInputField({
  input,
  values,
  result,
  library,
  formatMoney,
  onValueChange,
  onEdit,
}: {
  input: CalculatorInput;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: FormatMoney;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  onEdit: (input: CalculatorInput) => void;
}) {
  return (
    <div className="relative group">
      <CalculatorInputField
        input={input}
        rawValue={values[input.key]}
        resolvedValue={result.resolvedValues[input.key]}
        needed={result.missingInputs.includes(input.key)}
        library={library}
        formatMoney={formatMoney}
        onChange={(value) => onValueChange(input.key, value)}
      />
      <button
        type="button"
        onClick={() => onEdit(input)}
        aria-label={`Edit input ${input.label}`}
        className="absolute right-0 top-0 p-1 rounded text-ink-faint hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface PartCardProps {
  calculator: Calculator;
  part: CalculatorPart;
  result: CalculatorResult;
  values: CalculatorValues;
  library: CalculatorLibrary;
  formatMoney: FormatMoney;
  isFirst: boolean;
  isLast: boolean;
  expandedStepId: string | null;
  isStepShown: (stepId: string) => boolean;
  onToggleStep: (stepId: string) => void;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAddStep: () => void;
  onStepChange: (step: CalculatorStep) => void;
  onSetCost: (stepId: string | undefined) => void;
  onSetShown: (stepId: string, shown: boolean) => void;
  onMoveStep: (stepId: string, direction: -1 | 1) => void;
  onMoveStepToPart: (stepId: string, partId: string) => void;
  onRemoveStep: (step: CalculatorStep) => void;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  onEditInput: (input: CalculatorInput) => void;
  onCreateInput: (key?: string) => void;
  onCreateInputFor: (stepId: string, paramName: string, kind: FunctionParamKind) => void;
}

// A part of the calculator, built and tested on its own: the inputs its steps read (with
// live test values shared across the calculator), values it takes from other parts, its
// steps with live results, and its cost.
export function PartCard({
  calculator,
  part,
  result,
  values,
  library,
  formatMoney,
  isFirst,
  isLast,
  expandedStepId,
  isStepShown,
  onToggleStep,
  onRename,
  onMove,
  onRemove,
  onAddStep,
  onStepChange,
  onSetCost,
  onSetShown,
  onMoveStep,
  onMoveStepToPart,
  onRemoveStep,
  onValueChange,
  onEditInput,
  onCreateInput,
  onCreateInputFor,
}: PartCardProps) {
  const partResult = result.parts[part.id];
  const steps = calculator.steps.filter((step) => step.partId === part.id);
  const inputs = (partResult?.inputKeys ?? [])
    .map((key) => calculator.inputs.find((input) => input.key === key))
    .filter((input): input is CalculatorInput => !!input);
  const external = (partResult?.externalStepKeys ?? [])
    .map((key) => calculator.steps.find((step) => step.key === key))
    .filter((step): step is CalculatorStep => !!step);
  const costStep = steps.find((step) => step.id === part.costStepId);
  const costResult = costStep ? result.steps[costStep.id] : undefined;
  const headingId = `part-${part.id}`;

  const costDisplay = !costStep ? (
    <span className="text-xs text-ink-muted">No cost step</span>
  ) : partResult?.cost !== undefined ? (
    <span className="font-numeric text-lg font-semibold text-ink tabular-nums">{formatMoney(partResult.cost)}</span>
  ) : (
    <span className={cn('text-xs', costResult?.status === 'error' ? 'text-danger' : 'text-ink-muted')}>
      {describeStepProblem(costResult, calculator)}
    </span>
  );

  return (
    <Card className="p-0 overflow-hidden" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <input
          id={headingId}
          value={part.name}
          onChange={(event) => onRename(event.target.value)}
          aria-label="Part name"
          placeholder="Part name"
          className="flex-1 min-w-[140px] bg-transparent text-[15px] font-semibold text-ink rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-action"
        />
        <div className="text-right">{costDisplay}</div>
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${part.name || 'part'} up`}>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${part.name || 'part'} down`}>
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Delete ${part.name || 'part'}`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="p-4 space-y-3 border-b lg:border-b-0 lg:border-r border-border">
          <SectionBar
            id={`${headingId}-inputs`}
            title="Inputs"
            count={inputs.length}
            action={
              <Button variant="ghost" size="sm" onClick={() => onCreateInput()}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                New
              </Button>
            }
          />
          {inputs.length === 0 ? (
            <p className="text-xs text-ink-muted">Inputs show here once a step in this part uses them.</p>
          ) : (
            <div className="space-y-3">
              {inputs.map((input) => (
                <BuilderInputField
                  key={input.id}
                  input={input}
                  values={values}
                  result={result}
                  library={library}
                  formatMoney={formatMoney}
                  onValueChange={onValueChange}
                  onEdit={onEditInput}
                />
              ))}
            </div>
          )}
          {external.length > 0 && (
            <div className="pt-2">
              <SectionBar id={`${headingId}-external`} title="From other parts" count={external.length} />
              <dl className="mt-2 space-y-1">
                {external.map((step) => {
                  const stepResult = result.steps[step.id];
                  const owner = calculator.parts.find((candidate) => candidate.id === step.partId);
                  const problem = describeStepProblem(stepResult, calculator);
                  const shown =
                    stepResult?.displayValue !== undefined && !problem ? formatStepValue(step, stepResult.displayValue, formatMoney) : undefined;
                  return (
                    <div key={step.id} className="flex items-baseline justify-between gap-2">
                      <dt className="text-xs text-ink-body truncate">
                        {step.label} <span className="text-ink-faint">· {owner?.name}</span>
                      </dt>
                      <dd className="text-xs font-numeric text-ink-muted text-right">
                        {shown ? `${shown.text}${shown.unit ? ` ${shown.unit}` : ''}` : problem}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 min-w-0">
          <SectionBar
            id={`${headingId}-steps`}
            title="Steps"
            count={steps.length}
            action={
              <Button variant="ghost" size="sm" onClick={onAddStep}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add step
              </Button>
            }
          />
          {steps.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Add a step to start calculating. A step is a formula using inputs, other steps and functions.
            </p>
          ) : (
            <ul className="space-y-2">
              {steps.map((step, index) => (
                <StepRow
                  key={step.id}
                  calculator={calculator}
                  step={step}
                  result={result.steps[step.id]}
                  library={library}
                  formatMoney={formatMoney}
                  isCost={part.costStepId === step.id}
                  isShown={isStepShown(step.id)}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  expanded={expandedStepId === step.id}
                  onToggle={() => onToggleStep(step.id)}
                  onChange={onStepChange}
                  onSetCost={(isCost) => onSetCost(isCost ? step.id : undefined)}
                  onSetShown={(shown) => onSetShown(step.id, shown)}
                  onMove={(direction) => onMoveStep(step.id, direction)}
                  onMoveToPart={(partId) => onMoveStepToPart(step.id, partId)}
                  onRemove={() => onRemoveStep(step)}
                  onCreateInput={onCreateInput}
                  onCreateInputFor={(paramName, kind) => onCreateInputFor(step.id, paramName, kind)}
                />
              ))}
            </ul>
          )}
          {partResult && partResult.missingInputs.length > 0 && steps.length > 0 && (
            <p className="text-xs text-ink-muted">
              To test this part, fill in {describeInputs(partResult.missingInputs, calculator)}.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
