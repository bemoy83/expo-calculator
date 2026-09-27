'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { CalculatorForm, useLayoutContext } from '@/components/calculator/CalculatorForm';
import { ResultRow } from '@/components/live/ResultRow';
import { Button } from '@/components/ui/Button';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import type { Calculator, CalculatorLibrary, CalculatorValue, CalculatorValues } from '@/lib/calculator/types';
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
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  isFirst,
  isLast,
  notice,
  children,
}: Omit<QuoteLineEditorProps, 'calculator' | 'library'> & { notice?: React.ReactNode; children: React.ReactNode }) {
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const name = formatInstanceLabel(line.moduleName, line.nickname);
  const calculatorName = lineCalculatorName(line) ?? line.moduleName;
  return (
    <section aria-label={name} className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={line.nickname ?? ''}
          placeholder={line.moduleName}
          onChange={(event) => onChange({ ...line, nickname: event.target.value || undefined })}
          aria-label="Name on the quote"
          className="flex-1 min-w-[12rem] pb-1.5 bg-transparent border-b border-border-strong text-[22px] font-bold tracking-[-.02em] text-ink placeholder:text-ink focus:placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
        />
        <span className="px-2.5 py-[5px] rounded-full bg-sunken text-xs text-ink-muted">{calculatorName}</span>
        <div className="flex gap-1">
          {onDuplicate && (
            <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label={`Duplicate ${name}`} className="px-2.5">
              Duplicate
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${name} up`} className="px-2">
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${name} down`} className="px-2">
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="danger" size="sm" onClick={onRemove} aria-label={`Remove ${name} from the quote`} className="px-2.5">
            Remove
          </Button>
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
          <ResultRow label="Line total" value={formatMoney(line.cost)} total />
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
    <EditorShell {...props} notice={notice}>
      <CalculatorForm context={context} />
    </EditorShell>
  );
}

function ReadOnlyLine({ calculator: _calculator, library: _library, onDuplicate: _onDuplicate, ...props }: QuoteLineEditorProps) {
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
