'use client';

import { memo } from 'react';
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { DashedAdd } from '@/components/ui/DashedAdd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { FieldSize } from '@/components/ui/field-styles';
import { ResultRow } from '@/components/live/ResultRow';
import { CalculatorInputField } from '@/components/calculator/CalculatorInputField';
import { describeInputs, describeStepProblem, describeStepProblemShort, formatStepValue, isStepError } from '@/lib/calculator/format';
import { stepErrorLevel } from '@/lib/calculator/step-issues';
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
import type { ParamSpec } from '@/lib/calculator/call-context';
import { cn } from '@/lib/utils';
import { StepRow } from './StepRow';

type FormatMoney = (amount: number) => string;

/** A live input with a button to edit its definition. */
function BuilderInputField({
  input,
  values,
  result,
  library,
  formatMoney,
  onValueChange,
  onEdit,
  requiredProperties,
  size,
}: {
  size?: FieldSize;
  input: CalculatorInput;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
  formatMoney: FormatMoney;
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  onEdit: (input: CalculatorInput) => void;
  requiredProperties?: string[];
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
        requiredProperties={requiredProperties}
        size={size}
      />
      <button
        type="button"
        onClick={() => onEdit(input)}
        aria-label={`Edit input ${input.label}`}
        className="absolute right-0 -top-1 p-1 rounded text-ink-faint hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface PartViewProps {
  calculator: Calculator;
  part: CalculatorPart;
  result: CalculatorResult;
  values: CalculatorValues;
  library: CalculatorLibrary;
  formatMoney: FormatMoney;
  /** Properties read from each material/labor input. */
  required: Map<string, string[]>;
  expandedStepId: string | null;
  isStepShown: (stepId: string) => boolean;
}

interface PartStepsProps extends PartViewProps {
  isFirst: boolean;
  isLast: boolean;
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
  /** A new input, named `key` and shaped like the parameter it fills, if it fills one. */
  onCreateInput: (key?: string, param?: ParamSpec) => void;
}

// The chosen part's steps (mockup 4b, centre pane): its name, its steps as rows that open to
// edit, values it takes from other parts, and "+ Add step".
// Memoized: the handler props below are fresh closures every render of CalculatorBuilder, but
// they're behaviorally stable whenever the compared data props haven't changed (they all close
// over the same `edit`/state setters), so it's safe to bail without comparing them — this is
// what stops e.g. typing the calculator's name from re-rendering the whole steps list.
export const PartSteps = memo(function PartSteps({
  calculator,
  part,
  result,
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
  onCreateInput,
}: PartStepsProps) {
  const partResult = result.parts[part.id];
  const steps = calculator.steps.filter((step) => step.partId === part.id);
  const external = (partResult?.externalStepKeys ?? [])
    .map((key) => calculator.steps.find((step) => step.key === key))
    .filter((step): step is CalculatorStep => !!step);
  const headingId = `part-${part.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 px-0.5 pb-2.5">
        <input
          id={headingId}
          value={part.name}
          onChange={(event) => onRename(event.target.value)}
          aria-label="Part name"
          placeholder="Part name"
          className="flex-1 min-w-[160px] bg-transparent text-xl font-bold tracking-[-.02em] text-ink border-b border-transparent hover:border-border-strong focus:border-accent focus:outline-none transition-colors"
        />
        <div className="flex items-center gap-2">
          <IconButton label={`Move ${part.name || 'part'} up`} icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />} onClick={() => onMove(-1)} disabled={isFirst} />
          <IconButton label={`Move ${part.name || 'part'} down`} icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />} onClick={() => onMove(1)} disabled={isLast} />
          <Button variant="danger" size="sm" onClick={onRemove}>
            Delete part
          </Button>
        </div>
      </div>

      {steps.length === 0 ? (
        <p className="px-0.5 pb-2 text-[13px] text-ink-muted">
          Add a step to start calculating. A step is a formula using inputs, other steps and functions.
        </p>
      ) : (
        <ul className="flex flex-col">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              calculator={calculator}
              step={step}
              index={index + 1}
              result={result.steps[step.id]}
              stepResults={result.steps}
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
            />
          ))}
        </ul>
      )}
      <DashedAdd onClick={onAddStep} className="mt-1.5">
        + Add step
      </DashedAdd>
      {partResult && partResult.missingInputs.length > 0 && steps.length > 0 && (
        <p className="mt-1 px-0.5 text-xs text-ink-muted">
          To test this part, fill in {describeInputs(partResult.missingInputs, calculator)}.
        </p>
      )}

      {external.length > 0 && (
        <div className="mt-4 px-0.5">
          <Eyebrow as="h3">From other parts</Eyebrow>
          <dl className="mt-2 flex flex-col gap-1.5">
            {external.map((step) => {
              const stepResult = result.steps[step.id];
              const owner = calculator.parts.find((candidate) => candidate.id === step.partId);
              const problem = describeStepProblemShort(stepResult, calculator);
              const shown =
                stepResult?.displayValue !== undefined && !problem ? formatStepValue(step, stepResult.displayValue, formatMoney) : undefined;
              return (
                <div key={step.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                  <dt className="text-ink-body truncate">
                    <span className="font-numeric text-token-result">{step.key}</span>
                    <span className="text-ink-faint"> · {owner?.name}</span>
                  </dt>
                  <dd className="font-numeric text-ink-muted text-right">
                    {shown ? `${shown.text}${shown.unit ? ` ${shown.unit}` : ''}` : problem}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </section>
  );
},
(prev, next) =>
  prev.calculator === next.calculator &&
  prev.part === next.part &&
  prev.result === next.result &&
  prev.library === next.library &&
  prev.formatMoney === next.formatMoney &&
  prev.isFirst === next.isFirst &&
  prev.isLast === next.isLast &&
  prev.expandedStepId === next.expandedStepId
);

// The chosen part as staff see it (mockup 4b, live pane): the inputs its steps read, with test
// values shared across the calculator, then its results; the open step is highlighted.
// Memoized with the same reasoning as PartSteps above.
export const PartLivePane = memo(function PartLivePane({
  calculator,
  part,
  result,
  values,
  library,
  formatMoney,
  required,
  expandedStepId,
  isStepShown,
  onValueChange,
  onEditInput,
}: PartViewProps & {
  onValueChange: (key: string, value: CalculatorValue | undefined) => void;
  onEditInput: (input: CalculatorInput) => void;
}) {
  const partResult = result.parts[part.id];
  const inputs = (partResult?.inputKeys ?? [])
    .map((key) => calculator.inputs.find((input) => input.key === key))
    .filter((input): input is CalculatorInput => !!input);
  const shownSteps = calculator.steps.filter(
    (step) => step.partId === part.id && (isStepShown(step.id) || step.id === part.costStepId || step.id === expandedStepId)
  );

  return (
    <div className="flex flex-col gap-4">
      <Eyebrow>As staff see it</Eyebrow>
      {inputs.length === 0 ? (
        <p className="text-[13px] text-ink-muted">Inputs show here once a step in this part uses them.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {inputs.map((input) => (
            <div key={input.id} className={input.value.kind === 'material' || input.value.kind === 'labor' || input.value.kind === 'boolean' ? 'col-span-2' : undefined}>
              <BuilderInputField
                input={input}
                values={values}
                result={result}
                library={library}
                formatMoney={formatMoney}
                onValueChange={onValueChange}
                onEdit={onEditInput}
                requiredProperties={required.get(input.key)}
                size="compact"
              />
            </div>
          ))}
        </div>
      )}
      {shownSteps.length > 0 && (
        <div className="border-t border-border pt-3.5 flex flex-col gap-2.5 text-sm">
          {shownSteps.map((step) => {
            const stepResult = result.steps[step.id];
            const problem = describeStepProblem(stepResult, calculator);
            const shown =
              stepResult?.displayValue !== undefined && !problem ? formatStepValue(step, stepResult.displayValue, formatMoney) : undefined;
            return (
              <ResultRow
                key={step.id}
                label={step.label || step.key}
                value={
                  shown ? (
                    shown.text
                  ) : (
                    <span
                      title={isStepError(stepResult) ? stepResult?.message : undefined}
                      className={cn(
                        'text-xs',
                        stepErrorLevel(stepResult) === 'unresolved'
                          ? 'text-draft'
                          : isStepError(stepResult)
                            ? 'text-danger'
                            : stepResult?.incomplete
                              ? 'text-draft'
                              : 'text-ink-muted'
                      )}
                    >
                      {stepErrorLevel(stepResult) === 'unresolved' ? 'Unresolved' : (describeStepProblemShort(stepResult, calculator) ?? '—')}
                    </span>
                  )
                }
                unit={shown?.unit}
                highlight={step.id === expandedStepId}
                leader={false}
                className="text-sm"
              />
            );
          })}
        </div>
      )}
    </div>
  );
},
(prev, next) =>
  prev.calculator === next.calculator &&
  prev.part === next.part &&
  prev.result === next.result &&
  prev.values === next.values &&
  prev.library === next.library &&
  prev.formatMoney === next.formatMoney &&
  prev.required === next.required &&
  prev.expandedStepId === next.expandedStepId
);
