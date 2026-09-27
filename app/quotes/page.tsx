'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { QuoteBuilderLoading } from '@/components/quotes/QuoteBuilderLoading';
import { QuoteView } from '@/components/quotes/QuoteView';
import { useQuotesStore } from '@/lib/stores/quotes-store';

// The open quote. Lines come from calculators ("Send to quote"); this page shows them with
// markup, VAT, the total, and export.
export default function QuotesPage() {
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const createQuote = useQuotesStore((state) => state.createQuote);
  const deleteQuote = useQuotesStore((state) => state.deleteQuote);
  const router = useRouter();
  // Deleting the open quote leaves for the board; no new quote should take its place meanwhile.
  const leaving = useRef(false);

  // Check the live store, not `currentQuote`: during hydration zustand serves the pre-persist
  // initial state (currentQuote: null), and acting on that would overwrite the saved quote.
  useEffect(() => {
    const ensureQuote = () => {
      if (!leaving.current && !useQuotesStore.getState().currentQuote) {
        createQuote('New Quote');
      }
    };
    if (useQuotesStore.persist.hasHydrated()) {
      ensureQuote();
      return;
    }
    return useQuotesStore.persist.onFinishHydration(ensureQuote);
  }, [createQuote, currentQuote]);

  return (
    <Layout>
      {currentQuote ? (
        <QuoteView
          quote={currentQuote}
          onDelete={() => {
            leaving.current = true;
            deleteQuote(currentQuote.id);
            router.push('/quotes/board');
          }}
        />
      ) : (
        <QuoteBuilderLoading />
      )}
    </Layout>
  );
}
