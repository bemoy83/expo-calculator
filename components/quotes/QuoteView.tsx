'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DashedAdd } from '@/components/ui/DashedAdd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RailRow } from '@/components/ui/RailRow';
import { PageHeader } from '@/components/shared/PageHeader';
import { AddCalculatorDialog } from '@/components/quotes/AddCalculatorDialog';
import { QuoteLineEditor } from '@/components/quotes/QuoteLineEditor';
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

// A quote as a workspace (mockup 1a): the lines in a rail, the chosen line's calculator filled
// in and changed in place, and the receipt with markup, VAT, the total, and export.
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
  // The line open in the editor; the first line when none is chosen (or the chosen one went).
  const [chosenId, setChosenId] = useState<string | null>(null);
  const selected = quote.lineItems.find((item) => item.id === chosenId) ?? quote.lineItems[0];
  const selectedIndex = selected ? quote.lineItems.indexOf(selected) : -1;
  // New and duplicated lines open in the editor, and their rail row comes into view.
  const openAndShow = (id: string) => {
    setChosenId(id);
    requestAnimationFrame(() =>
      document.getElementById(`quote-line-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
    // The editor moves to the line that took its place, else the one before.
    const remaining = quote.lineItems.filter((item) => item.id !== id);
    setChosenId(remaining[Math.min(removed.index, remaining.length - 1)]?.id ?? null);
    notify({
      message: `Removed “${lineTitle(removed.line)}”.`,
      autoHideDuration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          insertLineItem(removed.line, removed.index);
          setChosenId(removed.line.id);
        },
      },
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
  const selectedCalculator = selected ? calculatorOf(selected) : undefined;

  // ⌘D / Ctrl+D duplicates the open line (instead of bookmarking the page).
  useEffect(() => {
    if (!selected || !selectedCalculator) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicate(selected.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const eyebrow = [
    'Quote',
    `${itemCount} ${itemCount === 1 ? 'line' : 'lines'}`,
    unfinished.length > 0 ? `${unfinished.length} not finished` : null,
    `edited ${formatEditedAt(quote.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      <PageHeader
        eyebrow={eyebrow}
        editing
        title={
          <input
            type="text"
            value={quote.name}
            onChange={(event) => updateCurrentQuote({ name: event.target.value })}
            aria-label="Quote name"
            placeholder="Untitled quote"
            className="w-full min-w-0 bg-transparent text-inherit placeholder:text-ink-faint focus:outline-none"
            size={Math.max(quote.name.length, 12)}
          />
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => requestExport('json')}>
              Export JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                saveQuote();
                notify({ variant: 'success', message: `Saved “${quote.name}”.` });
              }}
            >
              Save quote
            </Button>
            <Button variant="accent" onClick={() => setAdding(true)}>
              + Add calculator
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_360px] lg:flex-1 lg:min-h-0">
        <nav
          aria-label="Lines"
          className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto"
        >
          <div className="flex justify-between px-2.5 pb-2">
            <Eyebrow>Lines</Eyebrow>
            <span className="font-numeric text-xs text-ink-faint">{itemCount}</span>
          </div>
          {quote.lineItems.map((item, index) => (
            <div key={item.id} id={`quote-line-${item.id}`}>
              <RailRow
                index={index + 1}
                title={lineTitle(item)}
                subtitle={item.unfinished ?? (item.primarySummary || item.secondarySummary || item.fieldSummary)}
                value={item.unfinished ? 'Not finished' : formatCurrency(item.cost)}
                status={item.unfinished ? 'draft' : undefined}
                selected={item.id === selected?.id}
                onClick={() => setChosenId(item.id)}
              />
            </div>
          ))}
          <DashedAdd onClick={() => setAdding(true)} className="mt-2">
            + Add from calculator
          </DashedAdd>
          {itemCount > 0 && (
            <p className="mt-auto pt-4 px-2.5 text-xs leading-[1.5] text-ink-faint">
              Duplicate a line for each wall, room or part. <kbd className="font-numeric">⌘D</kbd>
            </p>
          )}
        </nav>

        <div className="min-w-0 px-4 sm:px-8 py-6 lg:overflow-y-auto">
          {selected ? (
            <QuoteLineEditor
              key={selected.id}
              line={selected}
              calculator={selectedCalculator}
              library={library}
              onChange={updateLineItem}
              onRemove={() => remove(selected.id)}
              onDuplicate={selectedCalculator ? () => duplicate(selected.id) : undefined}
              onMove={(direction) => moveLineItem(selected.id, direction)}
              isFirst={selectedIndex === 0}
              isLast={selectedIndex === itemCount - 1}
            />
          ) : (
            <div className="rounded-row border border-dashed border-border-strong px-4 py-10 text-center">
              <p className="text-sm text-ink-muted">
                No lines yet. Add a calculator, fill it in, and duplicate it for each wall, room or part.
              </p>
              <Button variant="accent" className="mt-3" onClick={() => setAdding(true)}>
                + Add calculator
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
          <QuoteSummaryCard
            quote={quote}
            formData={rates}
            onFormDataChange={(updates) => {
              setRates((current) => ({ ...current, ...updates }));
              if (updates.taxRate !== undefined) setTaxRate(updates.taxRate / 100);
              if (updates.markupPercent !== undefined) setMarkupPercent(updates.markupPercent);
            }}
            selectedId={selected?.id}
            onSelect={setChosenId}
            emptyMessage="No lines yet."
            onExport={() => requestExport('print')}
          />
        </div>
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
    </div>
  );
}
