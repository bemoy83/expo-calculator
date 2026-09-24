'use client';

import { Calculator } from 'lucide-react';

export function QuoteBuilderLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sunken border border-border mb-3">
          <Calculator className="h-6 w-6 text-ink-muted animate-pulse" aria-hidden="true" />
        </div>
        <p className="text-sm text-ink-muted">Loading quote…</p>
      </div>
    </div>
  );
}
