'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { CalculatorForm, useLayoutContext } from '@/components/calculator/CalculatorForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import type { Calculator, CalculatorLibrary, CalculatorValue, CalculatorValues } from '@/lib/calculator/types';
import { formatInstanceLabel } from '@/lib/quotes/nickname';
import { lineCalculatorName, lineTitle } from '@/lib/quotes/workspace';
import { lineWouldChange, rebuildCalculatorLine } from '@/lib/quotes/calculator-line-item';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { QuoteLineItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuoteLineCardProps {
  line: QuoteLineItem;
  /** The line's calculator, when it still exists. */
  calculator?: Calculator;
  library: CalculatorLibrary;
  open: boolean;
  onToggle: () => void;
  onChange: (line: QuoteLineItem) => void;
  onRemove: () => void;
  /** Left out for cards that can't be copied (their calculator is gone). */
  onDuplicate?: () => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}

// A quote line as a card: closed, one line with its name, summary and cost; open, its
// calculator filled in with the line's values, edited in place. Lines whose calculator is
// gone, and lines from the old module quote builder, show what they were and can't be edited.
export function QuoteLineCard(props: QuoteLineCardProps) {
  const { line, calculator } = props;
  return calculator && line.calculatorId === calculator.id ? (
    <EditableLineCard {...props} calculator={calculator} />
  ) : (
    <ReadOnlyLineCard {...props} />
  );
}

function CardShell({
  line,
  open,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  isFirst,
  isLast,
  summary,
  notice,
  children,
}: Omit<QuoteLineCardProps, 'calculator' | 'library'> & {
  summary?: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const name = formatInstanceLabel(line.moduleName, line.nickname);
  const title = lineTitle(line);
  const calculatorName = lineCalculatorName(line);
  return (
    <section
      id={`quote-line-${line.id}`}
      aria-label={name}
      className={cn('rounded-[10px] border bg-surface', line.unfinished ? 'border-draft-border' : 'border-border')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start gap-2.5 px-4 py-3 text-left rounded-[10px] hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <ChevronRight
          className={cn('h-4 w-4 mt-0.5 shrink-0 text-ink-muted transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink break-words">
            {title}
            {calculatorName && <span className="font-normal text-ink-muted"> · {calculatorName}</span>}
          </span>
          {line.unfinished ? (
            <span className="block text-xs text-draft">{line.unfinished}</span>
          ) : (
            summary && <span className="block text-xs font-numeric text-ink-muted break-words">{summary}</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          {line.unfinished ? (
            <span className="text-xs font-medium text-draft">Not finished</span>
          ) : (
            <span className="text-sm font-medium font-numeric text-ink tabular-nums">{formatMoney(line.cost)}</span>
          )}
        </span>
      </button>
      {notice}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          <div className="max-w-xs">
            <Input
              label="Name on the quote"
              value={line.nickname ?? ''}
              placeholder={line.moduleName}
              onChange={(event) => onChange({ ...line, nickname: event.target.value || undefined })}
            />
          </div>
          {children}
          <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
            {onDuplicate && (
              <Button variant="secondary" size="sm" onClick={onDuplicate} aria-label={`Duplicate ${name}`}>
                <Copy className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Duplicate
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${name} up`}>
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${name} down`}>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${name} from the quote`}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function EditableLineCard({ calculator, library, ...props }: QuoteLineCardProps & { calculator: Calculator }) {
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
    <div role="status" className="mx-4 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md bg-draft-bg border border-draft-border px-3 py-2">
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
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Update
      </Button>
    </div>
  ) : undefined;

  return (
    <CardShell {...props} summary={line.primarySummary || line.secondarySummary || line.fieldSummary} notice={notice}>
      <CalculatorForm context={context} variant="card" />
    </CardShell>
  );
}

function ReadOnlyLineCard({ calculator: _calculator, library: _library, onDuplicate: _onDuplicate, ...props }: QuoteLineCardProps) {
  const { line } = props;
  const details = line.details ?? [];
  return (
    <CardShell {...props} summary={line.primarySummary || line.secondarySummary || line.fieldSummary}>
      <p className="text-xs text-ink-muted">
        {line.calculatorId
          ? "This line's calculator no longer exists, so it can't be changed; it keeps what it had."
          : "This line comes from the old quote builder and can't be changed; it keeps what it had."}
      </p>
      {details.length > 0 && (
        <dl className="divide-y divide-border rounded-md border border-border">
          {details.map((detail, index) => (
            <div key={`${detail.label}-${index}`} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
              <dt className="text-sm text-ink-body">{detail.label}</dt>
              <dd className="text-sm font-numeric text-ink text-right">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </CardShell>
  );
}
