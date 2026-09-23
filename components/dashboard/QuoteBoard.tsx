'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  estimateTemplateCost,
  filterQuotesByName,
  formatEditedAt,
  getBoardQuotes,
  getQuoteDraftSummary,
  isPristineQuote,
} from '@/lib/quotes/quote-board';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { notify } from '@/lib/stores/notifications-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import type { ModuleTemplate, Quote } from '@/lib/types';

type FormatMoney = (amount: number) => string;

// Amber left edge on quotes with open drafts, repeating the builder's "not in the total" signal.
// !important because the dark theme's `.dark .border-md-outline` rule outranks a plain utility.
const DRAFT_EDGE = 'border-l-4 !border-l-warning';

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
  const applyTemplate = useQuotesStore((state) => state.applyTemplate);
  const deleteQuote = useQuotesStore((state) => state.deleteQuote);
  const templates = useTemplatesStore((state) => state.templates);
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const functions = useFunctionsStore((state) => state.functions);
  const { formatCurrency } = useCurrencyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const boardQuotes = useMemo(
    () => getBoardQuotes(savedQuotes, currentQuote),
    [savedQuotes, currentQuote]
  );
  const withDraftsCount = boardQuotes.filter((quote) => quote.workspaceModules.length > 0).length;

  // "Where you left off" is the quote open in the builder, unless that one is an untouched new
  // quote; then it's the most recently edited saved quote.
  const resumeQuote =
    currentQuote && !isPristineQuote(currentQuote, savedQuotes) ? currentQuote : boardQuotes[0];
  const isSearching = search.trim() !== '';
  const listedQuotes = isSearching
    ? filterQuotesByName(boardQuotes, search)
    : boardQuotes.filter((quote) => quote.id !== resumeQuote?.id);

  const templateEstimates = useMemo(
    () =>
      new Map(
        templates.map((template) => [
          template.id,
          estimateTemplateCost({ template, modules, materials, labor, functions }),
        ])
      ),
    [templates, modules, materials, labor, functions]
  );

  const handleOpen = (quote: Quote) => {
    if (openQuote(quote.id)) router.push('/quotes');
  };

  const handleNewQuote = () => {
    startNewQuote();
    router.push('/quotes');
  };

  const handleStartFromTemplate = (template: ModuleTemplate) => {
    startNewQuote(template.name);
    const result = applyTemplate(template.id);
    if (result.warnings.length > 0) {
      notify({
        variant: 'warning',
        message: `Template applied with ${pluralize(result.warnings.length, 'warning')}: ${result.warnings.join('; ')}`,
      });
    }
    router.push('/quotes');
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteQuote(pendingDelete.id);
    setPendingDelete(null);
  };

  if (!mounted) return null;

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Quotes</h1>
          <p className="text-sm text-md-on-surface-variant mt-1">
            {boardQuotes.length} total · {withDraftsCount} with open drafts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quotes…"
              aria-label="Search quotes"
              className="w-full h-10 pl-9 pr-3 rounded-full bg-md-surface-container border border-md-outline text-sm text-md-on-surface placeholder-md-on-surface-variant focus:outline-none focus:ring-2 focus:ring-md-primary"
            />
          </div>
          <Button onClick={handleNewQuote} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
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
              description="Start a quote from scratch, or launch one from a template."
              iconSize="small"
              actions={
                <Button onClick={handleNewQuote}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  New quote
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
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
                <p className="md:col-span-2 py-8 text-center text-sm text-md-on-surface-variant">
                  No quotes match “{search.trim()}”.
                </p>
              )}
            </div>
          )}
        </div>

        <TemplateRail
          templates={templates}
          estimates={templateEstimates}
          formatMoney={formatCurrency}
          onStart={handleStartFromTemplate}
        />
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

function DraftBadge({ count, suffix = '' }: { count: number; suffix?: string }) {
  return (
    <span className="shrink-0 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-medium">
      {pluralize(count, 'draft')}
      {suffix}
    </span>
  );
}

function ResumeCard({
  quote,
  formatMoney,
  onOpen,
}: {
  quote: Quote;
  formatMoney: FormatMoney;
  onOpen: (quote: Quote) => void;
}) {
  const drafts = getQuoteDraftSummary(quote);

  return (
    <section
      aria-labelledby="resume-quote-heading"
      className={cn(
        'md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-extra-large',
        'bg-md-surface-container border border-md-outline elevation-1',
        drafts.count > 0 && DRAFT_EDGE
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          id="resume-quote-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-md-on-surface-variant mb-2"
        >
          Pick up where you left off
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
          <h2 className="min-w-0 text-lg font-semibold text-md-on-surface break-words">{quote.name}</h2>
          {drafts.count > 0 && <DraftBadge count={drafts.count} suffix=" open" />}
        </div>
        <p className="text-xs font-mono text-md-on-surface-variant">
          {pluralize(quote.lineItems.length, 'item')} · edited {formatEditedAt(quote.updatedAt)}
        </p>
      </div>
      <div className="sm:text-right">
        <p className="text-xl font-semibold font-mono tabular-nums text-md-on-surface">
          {formatMoney(quote.total)}
        </p>
        {drafts.count > 0 && (
          <p className="text-xs font-mono tabular-nums text-warning">
            +{formatMoney(drafts.cost)} uncounted
          </p>
        )}
      </div>
      <Button onClick={() => onOpen(quote)} aria-label={`Continue ${quote.name}`} className="shrink-0">
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
  const drafts = getQuoteDraftSummary(quote);

  return (
    <div
      className={cn(
        'group relative p-4 rounded-extra-large bg-md-surface-container border border-md-outline',
        'hover:border-md-primary focus-within:border-md-primary transition-smooth',
        drafts.count > 0 && DRAFT_EDGE
      )}
    >
      <div className="flex items-start gap-2 mb-1">
        {/* The ::after overlay makes the whole card open the quote; Delete sits above it. */}
        <button
          type="button"
          onClick={() => onOpen(quote)}
          className="flex-1 min-w-0 text-left text-sm font-semibold text-md-on-surface truncate focus:outline-none after:absolute after:inset-0 after:rounded-extra-large focus-visible:after:ring-2 focus-visible:after:ring-md-primary"
        >
          {quote.name}
        </button>
        {drafts.count > 0 && <DraftBadge count={drafts.count} />}
        <button
          type="button"
          onClick={() => onDelete(quote)}
          aria-label={`Delete ${quote.name}`}
          className="row-action relative z-10 -mr-1 -mt-1 p-1 rounded-full text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary transition-opacity"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs font-mono text-md-on-surface-variant mb-3">
        {pluralize(quote.lineItems.length, 'item')} · {formatEditedAt(quote.updatedAt)}
      </p>
      <p className="text-lg font-semibold font-mono tabular-nums text-md-on-surface">
        {formatMoney(quote.total)}
      </p>
    </div>
  );
}

function TemplateRail({
  templates,
  estimates,
  formatMoney,
  onStart,
}: {
  templates: ModuleTemplate[];
  estimates: Map<string, number>;
  formatMoney: FormatMoney;
  onStart: (template: ModuleTemplate) => void;
}) {
  return (
    <aside aria-labelledby="template-rail-heading" className="w-full lg:w-72 shrink-0">
      <div className="p-4 rounded-extra-large bg-md-surface-container-low border border-md-outline">
        <h2
          id="template-rail-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-md-on-surface-variant mb-3"
        >
          Launch a template
        </h2>
        {templates.length === 0 ? (
          <p className="text-sm text-md-on-surface-variant">
            No templates yet. Save a quote&apos;s workspace as a template from the Quote Builder.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {templates.map((template, index) => (
              <li
                key={template.id}
                className="p-3 rounded-xl bg-md-surface-container border border-md-outline"
              >
                <p className="text-sm font-semibold text-md-on-surface truncate">{template.name}</p>
                <p className="text-xs font-mono text-md-on-surface-variant mb-2">
                  {pluralize(template.moduleInstances.length, 'module')} · ≈{' '}
                  {formatMoney(estimates.get(template.id) ?? 0)}
                </p>
                <Button
                  size="sm"
                  variant={index === 0 ? 'primary' : 'ghost'}
                  onClick={() => onStart(template)}
                  aria-label={`Start quote from ${template.name}`}
                  className={cn('w-full', index !== 0 && 'border border-md-outline text-md-primary')}
                >
                  Start quote
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-md-on-surface-variant">
          Templates carry their field links, so a value typed once feeds every module linked to it.
        </p>
      </div>
    </aside>
  );
}
