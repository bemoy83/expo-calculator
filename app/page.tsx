'use client';

import { Suspense, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { CalculatorsListView } from '@/components/calculator/CalculatorsListView';
import { useCalculatorLibrary, useCalculators } from '@/hooks/use-calculators';

export default function Home() {
  const calculators = useCalculators();
  const library = useCalculatorLibrary();
  // The stores hydrate from localStorage, so render their data only after mount to keep the
  // prerendered HTML and the first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Layout>
      {/* The chosen calculator is read from ?id=, which a static export reads on the client. */}
      <Suspense fallback={null}>
        {mounted && <CalculatorsListView calculators={calculators} library={library} />}
      </Suspense>
    </Layout>
  );
}
