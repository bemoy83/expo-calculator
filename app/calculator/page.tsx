'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { CalculatorRunView } from '@/components/calculator/CalculatorRunView';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCalculatorLibrary, useCalculators } from '@/hooks/use-calculators';

// Calculators live in the browser, so a static export can't have a page per calculator; the
// one to show comes from ?id=.
function CalculatorPageContent() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const calculators = useCalculators();
  const library = useCalculatorLibrary();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const calculator = calculators.find((candidate) => candidate.id === id);
  if (!calculator) {
    return (
      <EmptyState
        icon={CalculatorIcon}
        title="Calculator not found"
        description="It may have been deleted, or the link is incomplete."
        iconSize="small"
        actions={<Button onClick={() => router.push('/')}>All calculators</Button>}
      />
    );
  }
  return <CalculatorRunView key={calculator.id} calculator={calculator} library={library} />;
}

export default function CalculatorPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <CalculatorPageContent />
      </Suspense>
    </Layout>
  );
}
