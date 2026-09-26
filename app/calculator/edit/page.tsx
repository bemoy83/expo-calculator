'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { CalculatorBuilder } from '@/components/calculator-builder/CalculatorBuilder';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { convertedFrom, useCalculatorLibrary, useCalculators } from '@/hooks/use-calculators';
import { copyCalculator, createEmptyCalculator } from '@/lib/calculator/editing';
import type { Calculator } from '@/lib/calculator/types';
import { generateId } from '@/lib/utils';

type StartingPoint = { calculator: Calculator; isSaved: boolean } | null;

// What the builder starts from: a new calculator (no id), a saved one, or a module or template
// shown as a calculator, which is copied so saving it makes a calculator of its own. Worked out once per
// id; saving a new calculator changes the URL to its own id, which keeps the same draft.
function useStartingPoint(id: string | null, ready: boolean): StartingPoint | undefined {
  const calculators = useCalculators();
  const [opened, setOpened] = useState<{ forId: string | null; start: StartingPoint }>();

  useEffect(() => {
    if (!ready) return;
    if (opened && (opened.forId === id || opened.start?.calculator.id === id)) return;
    const now = new Date().toISOString();
    const found = id ? calculators.find((calculator) => calculator.id === id) : undefined;
    const start: StartingPoint = !id
      ? { calculator: createEmptyCalculator(generateId, now), isSaved: false }
      : !found
        ? null
        : convertedFrom(found)
          ? { calculator: copyCalculator(found, generateId, now), isSaved: false }
          : { calculator: found, isSaved: true };
    setOpened({ forId: id, start });
  }, [ready, id, opened, calculators]);

  return opened?.start;
}

function CalculatorEditContent() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const library = useCalculatorLibrary();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const start = useStartingPoint(id, mounted);

  if (!mounted || start === undefined) return null;
  if (!start) {
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
  // Keyed by the calculator it opened with, so saving a new one (which updates the URL) keeps
  // the builder as it is.
  return <CalculatorBuilder key={start.calculator.id} initial={start.calculator} isSaved={start.isSaved} library={library} />;
}

export default function CalculatorEditPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <CalculatorEditContent />
      </Suspense>
    </Layout>
  );
}
