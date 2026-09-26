'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator as CalculatorIcon, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuoteLineCard } from '@/components/quotes/QuoteLineCard';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { useCalculatorLibrary, useCalculators } from '@/hooks/use-calculators';
import { downloadQuoteJson, printQuote } from '@/lib/quotes/export';
import { formatEditedAt } from '@/lib/quotes/quote-board';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { notify } from '@/lib/stores/notifications-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import type { Quote, QuoteLineItem } from '@/lib/types';

type RateForm = { taxRate: number; markupPercent: number };

// A quote as a workspace: its lines are calculator cards, filled in and changed in place,
// beside the quote sheet with markup, VAT, the total, and export.
export function QuoteView({ quote }: { quote: Quote }) {
  const router = useRouter();
  const calculators = useCalculators();
  const library = useCalculatorLibrary();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const saveQuote = useQuotesStore((state) => state.saveQuote);
  const updateLineItem = useQuotesStore((state) => state.updateLineItem);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
            <span className="font-numeric">edited {formatEditedAt(quote.updatedAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadQuoteJson(quote)}>
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
          <Button size="sm" onClick={() => router.push('/')}>
            <CalculatorIcon className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add from a calculator
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-3 min-w-0">
          {quote.lineItems.map((item) => (
            <QuoteLineCard
              key={item.id}
              line={item}
              calculator={calculatorOf(item)}
              library={library}
              open={openIds.has(item.id)}
              onToggle={() => toggle(item.id)}
              onChange={updateLineItem}
              onRemove={() => removeLineItem(item.id)}
            />
          ))}
          {itemCount === 0 && (
            <p className="rounded-[10px] border border-dashed border-border-strong px-4 py-10 text-center text-sm text-ink-muted">
              No lines yet. Open a calculator, fill it in, and use Send to quote.
            </p>
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
          removeLineItem={removeLineItem}
          emptyMessage="No lines yet. Open a calculator, fill it in, and use Send to quote."
          onExport={() => printQuote(quote, formatCurrency)}
        />
      </div>
    </>
  );
}
