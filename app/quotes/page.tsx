'use client';

import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { QuoteBuilderLoading } from '@/components/quotes/QuoteBuilderLoading';
import { QuoteView } from '@/components/quotes/QuoteView';
import { useQuotesStore } from '@/lib/stores/quotes-store';

// The open quote. Lines come from calculators ("Send to quote"); this page shows them with
// markup, VAT, the total, and export.
export default function QuotesPage() {
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const createQuote = useQuotesStore((state) => state.createQuote);

  // Check the live store, not `currentQuote`: during hydration zustand serves the pre-persist
  // initial state (currentQuote: null), and acting on that would overwrite the saved quote.
  useEffect(() => {
    const ensureQuote = () => {
      if (!useQuotesStore.getState().currentQuote) {
        createQuote('New Quote');
      }
    };
    if (useQuotesStore.persist.hasHydrated()) {
      ensureQuote();
      return;
    }
    return useQuotesStore.persist.onFinishHydration(ensureQuote);
  }, [createQuote, currentQuote]);

  return <Layout>{currentQuote ? <QuoteView quote={currentQuote} /> : <QuoteBuilderLoading />}</Layout>;
}
