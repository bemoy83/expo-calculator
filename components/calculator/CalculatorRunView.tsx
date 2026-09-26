'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePlus2, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import { requiredProperties } from '@/lib/calculator/requirements';
import type { Calculator, CalculatorLibrary, CalculatorValues, LayoutSection } from '@/lib/calculator/types';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { cn } from '@/lib/utils';
import { useUseOnlyMode } from '@/hooks/use-device';
import {
  CalculatorLayoutItem,
  SectionHeading,
  isResultSection,
  isShown,
  itemSpan,
  type LayoutRenderContext,
} from './CalculatorLayoutItem';
import { SendToQuoteDialog } from './SendToQuoteDialog';

const EMPTY_VALUES: CalculatorValues = {};

// A calculator as staff use it: the layout's sections with live results, no editing tools.
export function CalculatorRunView({ calculator, library }: { calculator: Calculator; library: CalculatorLibrary }) {
  const values = useCalculatorSessionStore((state) => state.values[calculator.id]) ?? EMPTY_VALUES;
  const setValue = useCalculatorSessionStore((state) => state.setValue);
  const reset = useCalculatorSessionStore((state) => state.reset);
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const router = useRouter();
  const useOnly = useUseOnlyMode();
  const [sending, setSending] = useState(false);
  const origin = useCalculatorSessionStore((state) => state.origins[calculator.id]);

  const result = useMemo(() => evaluateCalculator(calculator, values, library), [calculator, values, library]);
  const inputsById = useMemo(() => new Map(calculator.inputs.map((input) => [input.id, input])), [calculator.inputs]);
  const inputsByKey = useMemo(() => new Map(calculator.inputs.map((input) => [input.key, input])), [calculator.inputs]);
  const required = useMemo(() => requiredProperties(calculator, library.functions), [calculator, library.functions]);
  const hasValues = Object.values(values).some((value) => value !== undefined);
  // Before anything is typed the results already say what they need, so inputs are only
  // marked "needed" once someone has started filling the calculator in.
  const needed = new Set(hasValues ? result.missingInputs : []);
  const context: LayoutRenderContext = {
    calculator,
    values,
    result,
    library,
    formatMoney,
    needed,
    inputsById,
    inputsByKey,
    onValueChange: (key, value) => setValue(calculator.id, key, value),
    required,
  };

  const visibleSections = calculator.layout.filter((section) => isShown(section.visibleWhen, context));
  const mainSections = visibleSections.filter((section) => !isResultSection(section));
  const sideSections = visibleSections.filter(isResultSection);

  const renderSection = (section: LayoutSection) => (
    <Card key={section.id} className="p-4 sm:p-5">
      <SectionHeading section={section} />
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-x-4 gap-y-3">
        {section.items.map((item, index) => (
          <div key={`${item.type}-${index}`} className={itemSpan(item)}>
            <CalculatorLayoutItem item={item} context={context} />
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-muted">
            <Link href="/" className="hover:text-ink focus:outline-none focus-visible:underline">
              Calculators
            </Link>{' '}
            <span aria-hidden="true">/</span>
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink truncate">{calculator.name}</h1>
          </div>
          {calculator.description && <p className="mt-0.5 text-sm text-ink-muted">{calculator.description}</p>}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="ghost" size="sm" onClick={() => reset(calculator.id)} disabled={!hasValues}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Reset
          </Button>
          {!useOnly && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/calculator/edit?id=${encodeURIComponent(calculator.id)}`)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setSending(true)}
            disabled={result.quoteCost === undefined}
            title={result.quoteCost === undefined ? 'Fill in the calculator to get a total first' : undefined}
          >
            <FilePlus2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Send to quote
          </Button>
        </div>
      </div>
      {origin && (
        <p className="-mt-2 mb-4 text-xs text-ink-muted">
          Opened from a quote line: change what you need, then Send to quote to update it.
        </p>
      )}

      <SendToQuoteDialog
        isOpen={sending}
        onClose={() => setSending(false)}
        calculator={calculator}
        values={values}
        result={result}
        library={library}
      />

      <div className={cn('grid gap-5', sideSections.length > 0 && 'lg:grid-cols-[minmax(0,1fr)_340px] items-start')}>
        <div className="space-y-5 min-w-0">{mainSections.map(renderSection)}</div>
        {sideSections.length > 0 && <div className="space-y-5 lg:sticky lg:top-8">{sideSections.map(renderSection)}</div>}
      </div>
    </>
  );
}
