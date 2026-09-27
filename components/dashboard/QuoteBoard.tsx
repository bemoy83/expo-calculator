'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LedgerRow, LedgerTable, type LedgerColumn } from '@/components/ui/LedgerTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { CommitBlock } from '@/components/live/CommitBlock';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { lineTitle } from '@/lib/quotes/workspace';
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

  const header = (
    <PageHeader
      eyebrow={mounted ? pluralize(boardQuotes.length, 'quote') : '\u00a0'}
      title="Quotes"
      actions={
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search quotes…"
            className="flex-1 min-w-[10rem] sm:w-[220px] sm:flex-none"
          />
          <Button variant="accent" onClick={handleNewQuote} className="shrink-0">
            + New quote
          </Button>
        </>
      }
    />
  );

  if (!mounted) return header;

  return (
    <>
      {header}
      <div className="flex flex-col gap-[22px] px-4 sm:px-6 py-[22px]">
        {boardQuotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Open a calculator, fill it in, and use Send to quote. Or start an empty quote here."
            iconSize="small"
            actions={
              <Button variant="accent" onClick={handleNewQuote}>
                + New quote
              </Button>
            }
          />
        ) : (
          <>
            {!isSearching && resumeQuote && (
              <CommitBlock
                layout="row"
                eyebrow="Pick up where you left off"
                title={<h2 className="break-words">{resumeQuote.name}</h2>}
                meta={resumeMeta(resumeQuote)}
                label="Total"
                amount={formatCurrency(resumeQuote.total)}
                actionLabel="Continue"
                onAction={() => handleOpen(resumeQuote)}
              />
            )}
            {listedQuotes.length > 0 && (
              <LedgerTable columns={QUOTE_COLUMNS}>
                {listedQuotes.map((quote) => (
                  <QuoteRow
                    key={quote.id}
                    quote={quote}
                    formatMoney={formatCurrency}
                    onOpen={handleOpen}
                    onDelete={setPendingDelete}
                  />
                ))}
              </LedgerTable>
            )}
            {isSearching && listedQuotes.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">No quotes match “{search.trim()}”.</p>
            )}
          </>
        )}
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

const QUOTE_COLUMNS: LedgerColumn[] = [
  { label: 'Quote' },
  { label: 'Lines', align: 'right', width: '90px', hideOnMobile: true },
  { label: 'Edited', width: '160px', hideOnMobile: true },
  { label: 'Total', align: 'right', width: 'minmax(7rem,160px)' },
  { label: <span className="sr-only">Actions</span>, align: 'right', width: '56px' },
];

// "3 lines · Bakvegg, Sidevegg 1, Sidevegg 2 · edited 23 min ago"
function resumeMeta(quote: Quote): string {
  const names = quote.lineItems.slice(0, 3).map(lineTitle);
  const more = quote.lineItems.length > 3 ? ', …' : '';
  return [
    pluralize(quote.lineItems.length, 'line'),
    names.length ? names.join(', ') + more : null,
    `edited ${formatEditedAt(quote.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

// A ledger row: the name opens the quote (its ::after covers the row); ⋯ becomes Delete on hover.
function QuoteRow({
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
  const empty = quote.lineItems.length === 0;
  return (
    <LedgerRow
      className="relative"
      cells={[
        <button
          key="name"
          type="button"
          onClick={() => onOpen(quote)}
          className="block w-full text-left text-sm font-semibold text-ink truncate focus:outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-action"
        >
          {quote.name}
        </button>,
        <span key="lines" className="font-numeric text-[13px] text-ink-muted">
          {quote.lineItems.length}
        </span>,
        <span key="edited" className="font-numeric text-[13px] text-ink-muted">
          {formatEditedAt(quote.updatedAt)}
        </span>,
        <span key="total" className={empty ? 'font-numeric text-ink-faint' : 'font-numeric'}>
          {empty ? '—' : formatMoney(quote.total)}
        </span>,
        <MoreHorizontal key="more" className="inline h-4 w-4 text-ink-faint" aria-hidden="true" />,
      ]}
      hoverCell={
        <button
          type="button"
          onClick={() => onDelete(quote)}
          aria-label={`Delete ${quote.name}`}
          className="relative z-10 text-[13px] text-danger rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          Delete
        </button>
      }
    />
  );
}
