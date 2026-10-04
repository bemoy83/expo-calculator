'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { CalculatorForm, useLayoutContext } from '@/components/calculator/CalculatorForm';
import { ResultRow } from '@/components/live/ResultRow';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import { lineColorVar } from '@/lib/calculator/line-color';
import type { Calculator, CalculatorLibrary, CalculatorValue, CalculatorValues } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { formatInstanceLabel } from '@/lib/quotes/nickname';
import { lineCalculatorName } from '@/lib/quotes/workspace';
import { lineWouldChange, rebuildCalculatorLine } from '@/lib/quotes/calculator-line-item';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { QuoteLineItem } from '@/lib/types';

interface QuoteLineEditorProps {
  line: QuoteLineItem;
  /** The line's calculator, when it still exists. */
  calculator?: Calculator;
  library: CalculatorLibrary;
  onChange: (line: QuoteLineItem) => void;
  onRemove: () => void;
  /** Left out for lines that can't be copied (their calculator is gone). */
  onDuplicate?: () => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}

// The quote line open in the editor (mockup 1a): its name on the quote, its calculator filled
// in with the line's values and changed in place, its results and the line total. Lines whose
// calculator is gone, and lines from the old module quote builder, show what they were and
// can't be edited.
export function QuoteLineEditor(props: QuoteLineEditorProps) {
  const { line, calculator } = props;
  return calculator && line.calculatorId === calculator.id ? (
    <EditableLine {...props} calculator={calculator} />
  ) : (
    <ReadOnlyLine {...props} />
  );
}

function EditorShell({
  line,
  calculator,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  isFirst,
  isLast,
  notice,
  children,
}: Omit<QuoteLineEditorProps, 'library'> & { notice?: React.ReactNode; children: React.ReactNode }) {
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const name = formatInstanceLabel(line.moduleName, line.nickname);
  const calculatorName = lineCalculatorName(line) ?? line.moduleName;
  const color = lineColorVar(calculator?.color);
  const actions: Array<{ label: string; ariaLabel: string; icon: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean }> = [
    ...(onDuplicate ? [{ label: 'Duplicate', ariaLabel: `Duplicate ${name}`, icon: <Copy className="h-4 w-4" aria-hidden="true" />, onClick: onDuplicate }] : []),
    { label: 'Move up', ariaLabel: `Move ${name} up`, icon: <ArrowUp className="h-4 w-4" aria-hidden="true" />, onClick: () => onMove(-1), disabled: isFirst },
    { label: 'Move down', ariaLabel: `Move ${name} down`, icon: <ArrowDown className="h-4 w-4" aria-hidden="true" />, onClick: () => onMove(1), disabled: isLast },
    { label: 'Remove', ariaLabel: `Remove ${name} from the quote`, icon: <Trash2 className="h-4 w-4" aria-hidden="true" />, onClick: onRemove, danger: true },
  ];
  return (
    <section aria-label={name} className="flex flex-col gap-[22px]">
      {/* With a colour the header is a band that runs edge to edge across the editor column,
          cancelling the scroller's padding. */}
      <div
        style={color ? { backgroundColor: color } : undefined}
        className={cn(
          'flex flex-wrap items-center gap-3',
          color && '-mx-4 sm:-mx-8 -mt-6 px-4 sm:px-8 pt-[22px] pb-[18px] text-[var(--on-line)]'
        )}
      >
        <input
          value={line.nickname ?? ''}
          placeholder={line.moduleName}
          onChange={(event) => onChange({ ...line, nickname: event.target.value || undefined })}
          aria-label="Name on the quote"
          className={cn(
            'flex-1 min-w-[12rem] pb-1.5 bg-transparent border-b text-[22px] font-bold tracking-[-.02em] focus:outline-none transition-colors',
            color
              ? 'border-[var(--on-line-rule)] text-[var(--on-line)] placeholder:text-[var(--on-line)] focus:placeholder:text-[var(--on-line-rule)] focus:border-[var(--on-line)] caret-[var(--on-line)]'
              : 'border-border-strong text-ink placeholder:text-ink focus:placeholder:text-ink-faint focus:border-accent'
          )}
        />
        <span
          className={cn('px-2.5 py-[5px] rounded-full text-xs', color ? 'bg-[var(--on-line-soft)] text-[var(--on-line)]' : 'bg-sunken text-ink-muted')}
        >
          {calculatorName}
        </span>
        <div className="flex gap-0.5">
          {actions.map((action) =>
            color ? (
              <button
                key={action.label}
                type="button"
                title={action.label}
                aria-label={action.ariaLabel}
                onClick={action.onClick}
                disabled={action.disabled}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--on-line)] transition-colors duration-150 hover:bg-[var(--on-line-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {action.icon}
              </button>
            ) : (
              <IconButton
                key={action.label}
                label={action.label}
                aria-label={action.ariaLabel}
                size="lg"
                variant={action.danger ? 'danger' : 'default'}
                icon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
              />
            )
          )}
        </div>
      </div>
      {notice}
      {children}
      <div className="border-t border-border pt-[18px]">
        {line.unfinished ? (
          <div className="flex items-baseline gap-2.5">
            <span className="text-[15px] font-semibold text-ink">Line total</span>
            <span className="flex-1" />
            <span className="text-sm text-draft">Not finished · {line.unfinished}</span>
          </div>
        ) : (
          <ResultRow label="Line total" value={formatMoney(line.cost)} total totalColor={color} />
        )}
      </div>
    </section>
  );
}

function EditableLine({ calculator, library, ...props }: QuoteLineEditorProps & { calculator: Calculator }) {
  const { line, onChange } = props;
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const values: CalculatorValues = useMemo(() => line.calculatorValues ?? {}, [line.calculatorValues]);
  const result = useMemo(() => evaluateCalculator(calculator, values, library), [calculator, values, library]);
  // What the line would be if worked out now; differs from the kept line only when prices or
  // the calculator changed since it was last edited.
  const now = useMemo(
    () => rebuildCalculatorLine({ line, calculator, values, library, formatMoney, result }),
    [line, calculator, values, library, formatMoney, result]
  );
  const changed = lineWouldChange(line, now);

  const onValueChange = (key: string, value: CalculatorValue | undefined) => {
    const next: CalculatorValues = { ...values, [key]: value };
    if (value === undefined) delete next[key];
    onChange(rebuildCalculatorLine({ line, calculator, values: next, library, formatMoney }));
  };
  const context = useLayoutContext({ calculator, values, result, library, formatMoney, onValueChange });

  const notice = changed ? (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md bg-draft-bg border border-draft-border px-3 py-2">
      <p className="flex-1 min-w-[200px] text-xs text-ink-body">
        {now.unfinished ? (
          <>The calculator has changed since this line was made: it now needs more ({now.unfinished.toLowerCase()}).</>
        ) : (
          <>
            Worked out now: <span className="font-numeric font-medium text-ink">{formatMoney(now.cost)}</span>
            {line.unfinished ? '.' : <> instead of {formatMoney(line.cost)} — prices or the calculator changed.</>}
          </>
        )}
      </p>
      <Button variant="secondary" size="sm" onClick={() => onChange(now)}>
        Update
      </Button>
    </div>
  ) : undefined;

  return (
    <EditorShell {...props} calculator={calculator} notice={notice}>
      <CalculatorForm context={context} />
    </EditorShell>
  );
}

function ReadOnlyLine({ library: _library, onDuplicate: _onDuplicate, ...props }: QuoteLineEditorProps) {
  const { line } = props;
  const details = line.details ?? [];
  return (
    <EditorShell {...props}>
      <p className="text-[13px] text-ink-muted">
        {line.calculatorId
          ? "This line's calculator no longer exists, so it can't be changed; it keeps what it had."
          : "This line comes from the old quote builder and can't be changed; it keeps what it had."}
      </p>
      {details.length > 0 && (
        <div className="flex flex-col gap-3">
          {details.map((detail, index) => (
            <ResultRow key={`${detail.label}-${index}`} label={detail.label} value={detail.value} />
          ))}
        </div>
      )}
    </EditorShell>
  );
}
