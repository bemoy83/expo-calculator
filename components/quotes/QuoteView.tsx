'use client';

import { useEffect, useState } from 'react';
import { ChevronsDownUp, Download, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddCalculatorDialog } from '@/components/quotes/AddCalculatorDialog';
import { QuoteLineCard } from '@/components/quotes/QuoteLineCard';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { useCalculatorLibrary, useCalculators } from '@/hooks/use-calculators';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { downloadQuoteJson, lineDisplayName, printQuote, unfinishedLines } from '@/lib/quotes/export';
import { formatEditedAt } from '@/lib/quotes/quote-board';
import { lineTitle, newCalculatorLine } from '@/lib/quotes/workspace';
import type { Calculator } from '@/lib/calculator/types';
import { generateId } from '@/lib/utils';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { notify } from '@/lib/stores/notifications-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import type { Quote, QuoteLineItem } from '@/lib/types';

type RateForm = { taxRate: number; markupPercent: number };

// A quote as a workspace: its lines are calculator cards, filled in and changed in place,
// beside the quote sheet with markup, VAT, the total, and export.
export function QuoteView({ quote }: { quote: Quote }) {
  const calculators = useCalculators();
  const library = useCalculatorLibrary();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const saveQuote = useQuotesStore((state) => state.saveQuote);
  const updateLineItem = useQuotesStore((state) => state.updateLineItem);
  const insertLineItem = useQuotesStore((state) => state.insertLineItem);
  const duplicateLineItem = useQuotesStore((state) => state.duplicateLineItem);
  const moveLineItem = useQuotesStore((state) => state.moveLineItem);
  const [adding, setAdding] = useState(false);
  // An export waiting on "Export anyway" because some lines aren't finished.
  const [pendingExport, setPendingExport] = useState<'print' | 'json' | null>(null);
  const unfinished = unfinishedLines(quote);
  const runExport = (kind: 'print' | 'json') =>
    kind === 'print' ? printQuote(quote, formatCurrency) : downloadQuoteJson(quote);
  const requestExport = (kind: 'print' | 'json') => (unfinished.length > 0 ? setPendingExport(kind) : runExport(kind));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // New and duplicated cards open, and come into view.
  const openAndShow = (id: string) => {
    setOpenIds((current) => new Set(current).add(id));
    requestAnimationFrame(() =>
      document.getElementById(`quote-line-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const addCalculator = (calculator: Calculator) => {
    const line = newCalculatorLine({ calculator, library, formatMoney: formatCurrency, id: generateId(), now: new Date().toISOString() });
    insertLineItem(line);
    setAdding(false);
    openAndShow(line.id);
  };
  const duplicate = (id: string) => {
    const copyId = duplicateLineItem(id);
    if (copyId) openAndShow(copyId);
  };
  const remove = (id: string) => {
    const removed = removeLineItem(id);
    if (!removed) return;
    notify({
      message: `Removed “${lineTitle(removed.line)}”.`,
      autoHideDuration: 8000,
      action: { label: 'Undo', onClick: () => insertLineItem(removed.line, removed.index) },
    });
  };

  // Rates as typed (percent), so typing isn't reformatted.
  const [rates, setRates] = useState<RateForm>({ taxRate: quote.taxRate * 100, markupPercent: quote.markupPercent });
  useEffect(() => {
    setRates({ taxRate: quote.taxRate * 100, markupPercent: quote.markupPercent });
    // Only when another quote opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  const itemCount = quote.lineItems.length;

  const calculatorOf = (item: QuoteLineItem) =>
    item.calculatorId ? calculators.find((calculator) => calculator.id === item.calculatorId) : undefined;

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={quote.name}
            onChange={(event) => updateCurrentQuote({ name: event.target.value })}
            aria-label="Quote name"
            placeholder="Untitled quote"
            className="w-full max-w-xl -mx-1.5 px-1.5 rounded-md bg-transparent border border-transparent text-2xl font-bold tracking-tight text-ink placeholder:text-ink-subtle hover:border-border focus:outline-none focus:border-action focus:ring-[3px] focus:ring-action/20"
          />
          <p className="text-xs text-ink-muted">
            {itemCount} {itemCount === 1 ? 'line item' : 'line items'} ·{' '}
            {/* The total is in the quote sheet too, but on a phone that's below every card. */}
            <span className="font-numeric font-medium text-ink">{formatCurrency(quote.total)}</span>
            {unfinished.length > 0 && <span className="text-draft"> ({unfinished.length} not finished)</span>} ·{' '}
            <span className="font-numeric">edited {formatEditedAt(quote.updatedAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => requestExport('json')}>
            <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Export JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              saveQuote();
              notify({ variant: 'success', message: `Saved “${quote.name}”.` });
            }}
          >
            <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Save quote
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add calculator
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-3 min-w-0">
          {openIds.size > 0 && (
            <div className="flex justify-end -mb-1">
              <Button variant="ghost" size="sm" onClick={() => setOpenIds(new Set())}>
                <ChevronsDownUp className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Close all
              </Button>
            </div>
          )}
          {quote.lineItems.map((item, index) => {
            const calculator = calculatorOf(item);
            return (
              <QuoteLineCard
                key={item.id}
                line={item}
                calculator={calculator}
                library={library}
                open={openIds.has(item.id)}
                onToggle={() => toggle(item.id)}
                onChange={updateLineItem}
                onRemove={() => remove(item.id)}
                onDuplicate={calculator ? () => duplicate(item.id) : undefined}
                onMove={(direction) => moveLineItem(item.id, direction)}
                isFirst={index === 0}
                isLast={index === itemCount - 1}
              />
            );
          })}
          {itemCount === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border-strong px-4 py-10 text-center">
              <p className="text-sm text-ink-muted">No lines yet. Add a calculator, fill it in, and duplicate it for each wall, room or part.</p>
              <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add calculator
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Add calculator
            </Button>
          )}
        </div>
        <QuoteSummaryCard
          quote={quote}
          formData={rates}
          onFormDataChange={(updates) => {
            setRates((current) => ({ ...current, ...updates }));
            if (updates.taxRate !== undefined) setTaxRate(updates.taxRate / 100);
            if (updates.markupPercent !== undefined) setMarkupPercent(updates.markupPercent);
          }}
          removeLineItem={remove}
          emptyMessage="No lines yet."
          onExport={() => requestExport('print')}
        />
      </div>
      <ConfirmDialog
        isOpen={pendingExport !== null}
        title={unfinished.length === 1 ? '1 line isn’t finished' : `${unfinished.length} lines aren’t finished`}
        message={`${unfinished
          .slice(0, 5)
          .map((item) => `${lineDisplayName(item)}: ${item.unfinished}`)
          .join('\n')}${unfinished.length > 5 ? `\n…and ${unfinished.length - 5} more` : ''}\n\nThey aren’t included in the total. Export anyway?`}
        confirmLabel="Export anyway"
        onConfirm={() => {
          if (pendingExport) runExport(pendingExport);
          setPendingExport(null);
        }}
        onCancel={() => setPendingExport(null)}
      />
      <AddCalculatorDialog isOpen={adding} onClose={() => setAdding(false)} calculators={calculators} onPick={addCalculator} />
    </>
  );
}
