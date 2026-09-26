'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator as CalculatorIcon, Download, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { useCalculators } from '@/hooks/use-calculators';
import { downloadQuoteJson, printQuote } from '@/lib/quotes/export';
import { formatEditedAt } from '@/lib/quotes/quote-board';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { notify } from '@/lib/stores/notifications-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import type { Quote, QuoteLineItem } from '@/lib/types';

type RateForm = { taxRate: number; markupPercent: number };

// A quote: its lines (sent from calculators with "Send to quote"), markup, VAT, total, and
// export. A calculator line opens in its calculator with Edit; sending it again updates it.
export function QuoteView({ quote }: { quote: Quote }) {
  const router = useRouter();
  const calculators = useCalculators();
  const modules = useModulesStore((state) => state.modules);
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const saveQuote = useQuotesStore((state) => state.saveQuote);
  const removeWorkspaceDrafts = useQuotesStore((state) => state.removeWorkspaceDrafts);
  const openFromLineItem = useCalculatorSessionStore((state) => state.openFromLineItem);

  // Rates as typed (percent), so typing isn't reformatted.
  const [rates, setRates] = useState<RateForm>({ taxRate: quote.taxRate * 100, markupPercent: quote.markupPercent });
  useEffect(() => {
    setRates({ taxRate: quote.taxRate * 100, markupPercent: quote.markupPercent });
    // Only when another quote opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  const itemCount = quote.lineItems.length;
  const drafts = quote.workspaceModules;

  const canEdit = (item: QuoteLineItem) =>
    !!item.calculatorId && calculators.some((calculator) => calculator.id === item.calculatorId);
  const editLine = (item: QuoteLineItem) => {
    if (!item.calculatorId || !canEdit(item)) return;
    saveQuote();
    openFromLineItem(item.calculatorId, item.calculatorValues ?? {}, { quoteId: quote.id, lineItemId: item.id });
    router.push(`/calculator?id=${encodeURIComponent(item.calculatorId)}`);
  };

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
          <Button variant="secondary" size="sm" onClick={() => downloadQuoteJson(quote, (id) => modules.find((module) => module.id === id))}>
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

      {drafts.length > 0 && (
        <div className="mb-4 rounded-md border border-draft-border bg-draft-bg px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'} from the old quote builder
          </p>
          <p className="mt-0.5 text-xs text-ink-body">
            {drafts
              .map((draft) => modules.find((module) => module.id === draft.moduleId)?.name ?? 'Missing module')
              .join(', ')}{' '}
            — never added to this quote, and no longer used now that quotes are filled from calculators. Add them again
            from a calculator if you need them.
          </p>
          <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-danger" onClick={removeWorkspaceDrafts}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Remove the drafts
          </Button>
        </div>
      )}

      <div className="max-w-2xl">
        <QuoteSummaryCard
          quote={quote}
          formData={rates}
          onFormDataChange={(updates) => {
            setRates((current) => ({ ...current, ...updates }));
            if (updates.taxRate !== undefined) setTaxRate(updates.taxRate / 100);
            if (updates.markupPercent !== undefined) setMarkupPercent(updates.markupPercent);
          }}
          removeLineItem={removeLineItem}
          editLineItem={editLine}
          canEditLineItem={canEdit}
          emptyMessage="No lines yet. Open a calculator, fill it in, and use Send to quote."
          onExport={() => printQuote(quote, formatCurrency)}
        />
      </div>
    </>
  );
}
