import { isStepShown, unplacedInputs } from '@/lib/calculator/editing';
import type { Calculator, LayoutItem } from '@/lib/calculator/types';

// Not-placed rows: a hairline below each, the label in ink and its formula name at the right.
const PALETTE_ROW =
  'w-full flex justify-between gap-2 px-2.5 py-[11px] border-b border-border text-[13px] text-left text-ink transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action';
const ADD_ROW =
  'w-full px-2.5 py-[9px] rounded-md text-[13px] text-left text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action';
const EYEBROW = 'px-2.5 font-numeric text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint';

interface LayoutPaletteProps {
  calculator: Calculator;
  /** Puts an item in the selected section (or the first) */
  onPlace: (item: LayoutItem) => void;
  /** A section after the selected one */
  onAddSection: () => void;
  onNewInput: () => void;
}

// The layout view's left rail: what isn't on the form yet, and what can be added to it.
export function LayoutPalette({ calculator, onPlace, onAddSection, onNewInput }: LayoutPaletteProps) {
  const unplaced = unplacedInputs(calculator);
  const unshownSteps = calculator.steps.filter((step) => !isStepShown(calculator, step.id));
  return (
    <nav aria-label="Add to the form" className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
      <h2 className={`${EYEBROW} pb-2`}>Not placed</h2>
      {unplaced.length === 0 && unshownSteps.length === 0 && (
        <p className="px-2.5 text-xs text-ink-muted">Every input and result is on the form.</p>
      )}
      {unplaced.map((input) => (
        <button
          key={input.id}
          type="button"
          className={PALETTE_ROW}
          onClick={() => onPlace({ type: 'input', inputId: input.id })}
          aria-label={`Place input ${input.label} on the form`}
        >
          <span className="truncate">{input.label}</span>
          <span className="font-numeric text-token-input truncate">{input.key}</span>
        </button>
      ))}
      {unshownSteps.map((step) => (
        <button
          key={step.id}
          type="button"
          className={PALETTE_ROW}
          onClick={() => onPlace({ type: 'result', stepId: step.id, style: 'row' })}
          aria-label={`Place result ${step.label || step.key} on the form`}
        >
          <span className="truncate">{step.label || step.key}</span>
          <span className="font-numeric text-token-result truncate">{step.key}</span>
        </button>
      ))}

      <h2 className={`${EYEBROW} pt-[22px] pb-2`}>Add</h2>
      <button type="button" className={ADD_ROW} onClick={onAddSection}>
        + Section
      </button>
      <button type="button" className={ADD_ROW} onClick={() => onPlace({ type: 'text', text: '' })}>
        + Text
      </button>
      <button type="button" className={ADD_ROW} onClick={() => onPlace({ type: 'divider' })}>
        + Divider
      </button>
      <button
        type="button"
        className={ADD_ROW}
        onClick={() => onPlace({ type: 'breakdown', partIds: calculator.parts.map((candidate) => candidate.id) })}
      >
        + Breakdown
      </button>
      <button type="button" className={ADD_ROW} onClick={onNewInput}>
        + New input
      </button>
      <p className="mt-auto pt-4 px-2.5 text-xs leading-[1.5] text-ink-faint">
        Select a section, then click to add to it. Drag items on the form by their handle to move them.
      </p>
    </nav>
  );
}
