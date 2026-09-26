import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quote, QuoteLineItem } from '../types';
import { generateId } from '../utils';
import { calculateQuoteTotals, roundMoney, roundRate } from '../calculations/money';
import { putLineItem } from '../quotes/calculator-line-item';
import { DEFAULT_QUOTE_NAME, stashQuote } from '../quotes/quote-board';
import { notify } from './notifications-store';

export type SendToQuoteTarget = { quoteId: string; replaceLineItemId?: string } | { newQuoteName: string };

/**
 * Quotes: saved quotes plus the one open on the quote page. Lines come from calculators
 * ("Send to quote"); totals are worked out from the lines, markup and VAT.
 */
interface QuotesStore {
  quotes: Quote[];
  currentQuote: Quote | null;
  createQuote: (name: string) => void;
  // Switching quotes saves the open one first (see stashQuote), so no work is lost.
  openQuote: (id: string) => boolean;
  startNewQuote: (name?: string) => void;
  updateCurrentQuote: (updates: Partial<Quote>) => void;
  /**
   * Adds a calculator's line to a quote (the open one, a saved one, or a new saved one), or
   * puts it in place of an existing line. Returns the quote, or null if it no longer exists.
   */
  sendToQuote: (target: SendToQuoteTarget, lineItem: QuoteLineItem) => Quote | null;
  removeLineItem: (lineItemId: string) => void;
  recalculateQuote: () => void;
  setTaxRate: (rate: number) => void;
  setMarkupPercent: (percent: number) => void;
  saveQuote: () => void;
  deleteQuote: (id: string) => void;
}

function newQuote(name: string): Quote {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    lineItems: [],
    subtotal: 0,
    markupPercent: 0,
    markupAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
}

type StoredQuote = Quote & { workspaceModules?: unknown[] };

// Quotes saved by the old quote builder carry drafts from its module workspace, which is gone.
// They were never part of the quote or its total; they're dropped, and the quotes named.
export function withoutDrafts(state: { quotes?: StoredQuote[]; currentQuote?: StoredQuote | null }) {
  const withDrafts = new Set<string>();
  const strip = (quote: StoredQuote): Quote => {
    const { workspaceModules, ...rest } = quote;
    if (Array.isArray(workspaceModules) && workspaceModules.length > 0) withDrafts.add(quote.name || 'Untitled quote');
    return rest;
  };
  const quotes = (state.quotes ?? []).map(strip);
  const currentQuote = state.currentQuote ? strip(state.currentQuote) : null;
  return { quotes, currentQuote, withDrafts: [...withDrafts] };
}

export const useQuotesStore = create<QuotesStore>()(
  persist(
    (set, get) => ({
      quotes: [],
      currentQuote: null,

      createQuote: (name) => {
        set({ currentQuote: newQuote(name) });
      },

      openQuote: (id) => {
        const { quotes, currentQuote } = get();
        if (currentQuote?.id === id) return true;
        const target = quotes.find((quote) => quote.id === id);
        if (!target) return false;
        set({ quotes: stashQuote(quotes, currentQuote), currentQuote: target });
        return true;
      },

      startNewQuote: (name = DEFAULT_QUOTE_NAME) => {
        const { quotes, currentQuote } = get();
        set({ quotes: stashQuote(quotes, currentQuote) });
        get().createQuote(name);
      },

      updateCurrentQuote: (updates) => {
        const current = get().currentQuote;
        if (current) {
          set({
            currentQuote: {
              ...current,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          });
          get().recalculateQuote();
        }
      },

      sendToQuote: (target, lineItem) => {
        const { quotes, currentQuote } = get();
        if ('newQuoteName' in target) {
          const quote = putLineItem(newQuote(target.newQuoteName.trim() || DEFAULT_QUOTE_NAME), lineItem);
          set({ quotes: [...quotes, quote] });
          return quote;
        }
        // The open quote is the live copy; keep the saved list in step with it.
        if (currentQuote?.id === target.quoteId) {
          const quote = putLineItem(currentQuote, lineItem, target.replaceLineItemId);
          set({ currentQuote: quote, quotes: stashQuote(quotes, quote) });
          return quote;
        }
        const saved = quotes.find((quote) => quote.id === target.quoteId);
        if (!saved) return null;
        const quote = putLineItem(saved, lineItem, target.replaceLineItemId);
        set({ quotes: quotes.map((candidate) => (candidate.id === quote.id ? quote : candidate)) });
        return quote;
      },

      removeLineItem: (lineItemId) => {
        const current = get().currentQuote;
        if (!current) return;

        set({
          currentQuote: {
            ...current,
            lineItems: current.lineItems.filter((item) => item.id !== lineItemId),
            updatedAt: new Date().toISOString(),
          },
        });

        get().recalculateQuote();
      },

      // Recalculate quote totals from the line items.
      // Calculation order: Subtotal → Markup → Tax (on subtotal + markup) → Total
      recalculateQuote: () => {
        const current = get().currentQuote;
        if (!current) return;

        const totals = calculateQuoteTotals({
          lineItems: current.lineItems,
          markupPercent: current.markupPercent,
          taxRate: current.taxRate,
        });

        set({
          currentQuote: {
            ...current,
            ...totals,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setTaxRate: (rate) => {
        get().updateCurrentQuote({ taxRate: roundRate(rate) });
      },

      setMarkupPercent: (percent) => {
        const clampedPercent = Math.max(0, percent || 0);
        get().updateCurrentQuote({ markupPercent: roundMoney(clampedPercent) });
      },

      saveQuote: () => {
        const current = get().currentQuote;
        if (!current) return;

        set((state) => {
          const existingIndex = state.quotes.findIndex((q) => q.id === current.id);
          const updatedQuotes =
            existingIndex >= 0
              ? state.quotes.map((q, i) => (i === existingIndex ? current : q))
              : [...state.quotes, current];

          return {
            quotes: updatedQuotes,
          };
        });
      },

      deleteQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
          currentQuote: state.currentQuote?.id === id ? null : state.currentQuote,
        }));
      },
    }),
    {
      name: 'quotes-store',
      // v1: the module workspace is gone; its drafts are dropped from saved quotes.
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { quotes?: StoredQuote[]; currentQuote?: StoredQuote | null };
        if (version >= 1 || !state) return state as QuotesStore;
        const { quotes, currentQuote, withDrafts } = withoutDrafts(state);
        if (withDrafts.length > 0) {
          notify({
            variant: 'info',
            autoHideDuration: 0,
            message: `Quotes now take their lines from calculators, so the unused drafts from the old quote builder were removed from: ${withDrafts.join(', ')}. The quotes' lines and totals are unchanged.`,
          });
        }
        return { ...state, quotes, currentQuote } as QuotesStore;
      },
    }
  )
);
