import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { IconButton } from '@/components/ui/IconButton';
import { describeCondition } from '@/lib/calculator/format';
import type { Calculator, CalculatorLibrary, CalculatorStep } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { NO_CONDITION_HINT, canStartCondition, startCondition } from './ConditionEditor';

/** "Move to part ▾": a quiet 32px button over a transparent native select. */
function MoveToPart({
  calculator,
  step,
  onMoveToPart,
}: {
  calculator: Calculator;
  step: CalculatorStep;
  onMoveToPart: (partId: string) => void;
}) {
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

interface StepStripProps {
  calculator: Calculator;
  library: CalculatorLibrary;
  step: CalculatorStep;
  isCost: boolean;
  isShown: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (step: CalculatorStep) => void;
  onSetCost: (isCost: boolean) => void;
  onSetShown: (shown: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onMoveToPart: (partId: string) => void;
  onRemove: () => void;
}

// The strip beside an open step: what it does in its part (cost, shown to staff, only when…), and where it sits.
export function StepStrip({ calculator, library, step, isCost, isShown, isFirst, isLast, onChange, onSetCost, onSetShown, onMove, onMoveToPart, onRemove }: StepStripProps) {
  return (
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
        <IconButton
          label="Move step up"
          icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onMove(-1)}
          disabled={isFirst}
        />
        <IconButton
          label="Move step down"
          icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onMove(1)}
          disabled={isLast}
        />
        {calculator.parts.length > 1 && <MoveToPart calculator={calculator} step={step} onMoveToPart={onMoveToPart} />}
        <Button variant="danger" size="sm" className="ml-auto" onClick={onRemove}>
          <span className="step-wide-only">Delete</span>
          <span className="step-narrow-only">Delete step</span>
        </Button>
      </div>
    </div>
  );
}
