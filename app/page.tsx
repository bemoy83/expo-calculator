'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { CalculatorsListView } from '@/components/calculator/CalculatorsListView';
import { useCalculators } from '@/hooks/use-calculators';

export default function Home() {
  const calculators = useCalculators();
  // The stores hydrate from localStorage, so render their data only after mount to keep the
  // prerendered HTML and the first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return <Layout>{mounted && <CalculatorsListView calculators={calculators} />}</Layout>;
}
