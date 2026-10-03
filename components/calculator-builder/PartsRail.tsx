import { DashedAdd } from '@/components/ui/DashedAdd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RailRow } from '@/components/ui/RailRow';
import { displayUnit } from '@/lib/calculator/format';
import { stepErrorLevel } from '@/lib/calculator/step-issues';
import type { Calculator, CalculatorInput, CalculatorResult } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';

/** What an input is, in the inputs list: its unit, or its kind. */
function inputDetail(input: CalculatorInput): string {
  const spec = input.value;
  if ('unitSymbol' in spec && spec.unitSymbol) return displayUnit(spec.unitSymbol) ?? spec.unitSymbol;
  if (spec.kind === 'material' || spec.kind === 'labor') return spec.category || spec.kind;
  if (spec.kind === 'boolean') return 'yes/no';
  return spec.kind;
}

interface PartsRailProps {
  calculator: Calculator;
  result: CalculatorResult;
  formatMoney: (amount: number) => string;
  /** The part open in the centre */
  selectedPartId: string | undefined;
  /** Input keys some step reads */
  usedInputs: Set<string>;
  onSelectPart: (partId: string) => void;
  onAddPart: () => void;
  onNewInput: () => void;
  onEditInput: (input: CalculatorInput) => void;
}

// The parts view's left rail: the parts, each with its cost or its trouble, and the inputs.
export function PartsRail({ calculator, result, formatMoney, selectedPartId, usedInputs, onSelectPart, onAddPart, onNewInput, onEditInput }: PartsRailProps) {
  const partStatus = (partId: string) =>
    calculator.steps.some((step) => step.partId === partId && stepErrorLevel(result.steps[step.id]) === 'broken')
      ? ('error' as const)
      : calculator.steps.some(
            (step) => step.partId === partId && (stepErrorLevel(result.steps[step.id]) === 'unresolved' || result.steps[step.id]?.incomplete)
          )
        ? ('draft' as const)
        : undefined;

  return (
    <nav aria-label="Parts and inputs" className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
      <div className="flex justify-between px-2.5 pb-2">
        <Eyebrow>Parts</Eyebrow>
        <span className="font-numeric text-xs text-ink-faint">{calculator.parts.length}</span>
      </div>
      {calculator.parts.map((candidate, index) => {
        const cost = result.parts[candidate.id]?.cost;
        return (
          <RailRow
            key={candidate.id}
            index={index + 1}
            title={candidate.name || 'Unnamed part'}
            stacked
            value={cost !== undefined ? formatMoney(cost) : partStatus(candidate.id) ? undefined : '—'}
            status={partStatus(candidate.id)}
            selected={candidate.id === selectedPartId}
            onClick={() => onSelectPart(candidate.id)}
          />
        );
      })}
      <DashedAdd onClick={onAddPart} className="mt-1 p-2.5">
        + Add part
      </DashedAdd>

      <div className="flex justify-between items-baseline px-2.5 pt-[22px] pb-2">
        <Eyebrow>Inputs</Eyebrow>
        <button
          type="button"
          onClick={onNewInput}
          className="font-numeric text-xs tracking-[.06em] text-ink hover:text-ink-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          + New
        </button>
      </div>
      {calculator.inputs.length === 0 && (
        <p className="px-2.5 text-xs text-ink-muted">No inputs yet. A formula naming one that doesn&apos;t exist offers to create it.</p>
      )}
      {calculator.inputs.map((input) => {
        const used = usedInputs.has(input.key);
        return (
          <button
            key={input.id}
            type="button"
            onClick={() => onEditInput(input)}
            title={`${input.label}${used ? '' : ' · not used by any step yet'}`}
            aria-label={`Edit input ${input.label}${used ? '' : ', not used yet'}`}
            className={cn(
              'flex justify-between gap-2 px-2.5 py-[7px] rounded-md text-[13px] text-left transition-colors hover:bg-surface-hover',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              !used && 'bg-sunken'
            )}
          >
            <span className={cn('font-numeric truncate', used ? 'text-token-input' : 'text-ink-muted')}>{input.key}</span>
            <span className={cn('shrink-0 text-xs', used ? 'font-numeric text-ink-faint' : 'text-ink-faint')}>
              {used ? inputDetail(input) : 'not used'}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
