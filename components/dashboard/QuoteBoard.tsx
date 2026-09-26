'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  filterQuotesByName,
  formatEditedAt,
  getBoardQuotes,
  isPristineQuote,
} from '@/lib/quotes/quote-board';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import type { Quote } from '@/lib/types';

type FormatMoney = (amount: number) => string;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function QuoteBoard() {
  const router = useRouter();
  // The stores hydrate synchronously from localStorage, so render their data only after
  // mount to keep the prerendered HTML and the first client render identical.
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Quote | null>(null);

  const savedQuotes = useQuotesStore((state) => state.quotes);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const openQuote = useQuotesStore((state) => state.openQuote);
  const startNewQuote = useQuotesStore((state) => state.startNewQuote);
  const deleteQuote = useQuotesStore((state) => state.deleteQuote);
  const { formatCurrency } = useCurrencyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const boardQuotes = useMemo(
    () => getBoardQuotes(savedQuotes, currentQuote),
    [savedQuotes, currentQuote]
  );

  // "Where you left off" is the quote open in the builder, unless that one is an untouched new
  // quote; then it's the most recently edited saved quote.
  const resumeQuote =
    currentQuote && !isPristineQuote(currentQuote, savedQuotes) ? currentQuote : boardQuotes[0];
  const isSearching = search.trim() !== '';
  const listedQuotes = isSearching
    ? filterQuotesByName(boardQuotes, search)
    : boardQuotes.filter((quote) => quote.id !== resumeQuote?.id);

  const handleOpen = (quote: Quote) => {
    if (openQuote(quote.id)) router.push('/quotes');
  };

  const handleNewQuote = () => {
    startNewQuote();
    router.push('/quotes');
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteQuote(pendingDelete.id);
    setPendingDelete(null);
  };

  if (!mounted) return null;

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Quotes</h1>
          <p className="text-xs text-ink-muted">
            {pluralize(boardQuotes.length, 'quote')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-[210px] sm:flex-none">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quotes…"
              aria-label="Search quotes"
              className="w-full h-9 pl-8 pr-3 rounded-md bg-surface border border-border-strong text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-action focus:ring-[3px] focus:ring-action/20"
            />
          </div>
          <Button onClick={handleNewQuote} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New quote
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0">
          {boardQuotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotes yet"
              description="Open a calculator, fill it in, and use Send to quote. Or start an empty quote here."
              iconSize="small"
              actions={
                <Button onClick={handleNewQuote}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  New quote
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 content-start">
              {!isSearching && resumeQuote && (
                <ResumeCard quote={resumeQuote} formatMoney={formatCurrency} onOpen={handleOpen} />
              )}
              {listedQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  formatMoney={formatCurrency}
                  onOpen={handleOpen}
                  onDelete={setPendingDelete}
                />
              ))}
              {isSearching && listedQuotes.length === 0 && (
                <p className="md:col-span-2 py-8 text-center text-sm text-ink-muted">
                  No quotes match “{search.trim()}”.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete quote?"
        message={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

// Mockup 2d: surface card, strong hairline, 10px radius; money in mono, the quote total in
// committed green (it's what the client pays).
function ResumeCard({
  quote,
  formatMoney,
  onOpen,
}: {
  quote: Quote;
  formatMoney: FormatMoney;
  onOpen: (quote: Quote) => void;
}) {
  return (
    <section
      aria-labelledby="resume-quote-heading"
      className={cn(
        'md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-[18px] py-4 rounded-[10px]',
        'bg-surface border border-border-strong shadow-card'
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          id="resume-quote-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-2"
        >
          Pick up where you left off
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
          <h2 className="min-w-0 text-[15px] font-semibold text-ink break-words">{quote.name}</h2>
        </div>
        <p className="text-[11.5px] font-numeric text-ink-muted">
          {pluralize(quote.lineItems.length, 'item')} · edited {formatEditedAt(quote.updatedAt)}
        </p>
      </div>
      <div className="sm:text-right">
        <p className="text-xl font-semibold font-numeric text-committed">{formatMoney(quote.total)}</p>
      </div>
      <Button onClick={() => onOpen(quote)} aria-label={`Continue ${quote.name}`} className="shrink-0 h-[38px]">
        Continue
      </Button>
    </section>
  );
}

function QuoteCard({
  quote,
  formatMoney,
  onOpen,
  onDelete,
}: {
  quote: Quote;
  formatMoney: FormatMoney;
  onOpen: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
}) {
  return (
    <div
      className={cn(
        'group relative px-4 py-3.5 rounded-[10px] bg-surface border border-border-strong transition-colors',
        'hover:bg-surface-hover'
      )}
    >
      <div className="flex items-start gap-2 mb-0.5">
        {/* The ::after overlay makes the whole card open the quote; Delete sits above it. */}
        <button
          type="button"
          onClick={() => onOpen(quote)}
          className="flex-1 min-w-0 text-left text-[13.5px] font-semibold text-ink truncate focus:outline-none after:absolute after:inset-0 after:rounded-[10px] focus-visible:after:ring-2 focus-visible:after:ring-action"
        >
          {quote.name}
        </button>
        <button
          type="button"
          onClick={() => onDelete(quote)}
          aria-label={`Delete ${quote.name}`}
          className="row-action relative z-10 -mr-1 -mt-0.5 p-1 rounded-md text-ink-muted hover:text-danger hover:bg-danger-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-opacity"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-[11px] font-numeric text-ink-faint mb-2.5">
        {pluralize(quote.lineItems.length, 'item')} · {formatEditedAt(quote.updatedAt)}
      </p>
      <p className="text-lg font-semibold font-numeric text-ink">{formatMoney(quote.total)}</p>
    </div>
  );
}
