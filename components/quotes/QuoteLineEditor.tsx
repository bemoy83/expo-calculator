'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { CalculatorForm, useLayoutContext } from '@/components/calculator/CalculatorForm';
import { ResultRow } from '@/components/live/ResultRow';
import { Button } from '@/components/ui/Button';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import { lineColorVar } from '@/lib/calculator/line-color';
import type { Calculator, CalculatorLibrary, CalculatorValue, CalculatorValues } from '@/lib/calculator/types';
import { LineHeader, LineTotal, type LineAction } from './LineEditorParts';
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
  const icon = 'h-4 w-4';
  const actions: LineAction[] = [
    ...(onDuplicate ? [{ label: 'Duplicate', ariaLabel: `Duplicate ${name}`, icon: <Copy className={icon} aria-hidden="true" />, onClick: onDuplicate }] : []),
    { label: 'Move up', ariaLabel: `Move ${name} up`, icon: <ArrowUp className={icon} aria-hidden="true" />, onClick: () => onMove(-1), disabled: isFirst },
    { label: 'Move down', ariaLabel: `Move ${name} down`, icon: <ArrowDown className={icon} aria-hidden="true" />, onClick: () => onMove(1), disabled: isLast },
    { label: 'Remove', ariaLabel: `Remove ${name} from the quote`, icon: <Trash2 className={icon} aria-hidden="true" />, onClick: onRemove, danger: true },
  ];
  return (
    <section aria-label={name} className="flex flex-col gap-[22px]">
      <LineHeader
        color={color}
        nickname={line.nickname ?? ''}
        placeholder={line.moduleName}
        calculatorName={calculatorName}
        actions={actions}
        onNicknameChange={(nickname) => onChange({ ...line, nickname: nickname || undefined })}
      />
      {notice}
      {children}
      <LineTotal color={color} value={formatMoney(line.cost)} unfinished={line.unfinished} />
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
