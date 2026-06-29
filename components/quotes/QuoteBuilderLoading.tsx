'use client';

import { Calculator } from 'lucide-react';

export function QuoteBuilderLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Calculator className="h-8 w-8 text-md-on-surface-variant animate-pulse" />
        </div>
        <p className="text-md-on-surface-variant">Loading quote builder...</p>
      </div>
    </div>
  );
}
