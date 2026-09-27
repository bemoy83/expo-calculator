'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumb, browseHref } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { useUseOnlyMode } from '@/hooks/use-device';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorLivePane } from './CalculatorLivePane';
import { SendToQuoteDialog } from './SendToQuoteDialog';
import { useCalculatorRun } from './useCalculatorRun';

const editHref = (calculator: Calculator) => `/calculator/edit?id=${encodeURIComponent(calculator.id)}`;

// A calculator as staff use it, full size (mockup 4a): its sections with 46px inputs, and a
// live pane with the results, part costs and the total to send to a quote.
export function CalculatorRunView({ calculator, library }: { calculator: Calculator; library: CalculatorLibrary }) {
  const router = useRouter();
  const useOnly = useUseOnlyMode();
  const [sending, setSending] = useState(false);
  const run = useCalculatorRun(calculator, library, 'large');
  const category = calculator.category?.trim();

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      <PageHeader
        eyebrow={
          <Breadcrumb
            items={[
              { label: 'Calculators', href: browseHref('/', { id: calculator.id }) },
              ...(category ? [{ label: category, href: browseHref('/', { category, id: calculator.id }) }] : []),
            ]}
          />
        }
        title={calculator.name}
        description={calculator.description}
        actions={
          <>
            <Button variant="ghost" onClick={run.reset} disabled={!run.hasValues}>
              Reset
            </Button>
            {!useOnly && (
              <Button variant="secondary" onClick={() => router.push(editHref(calculator))}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] lg:flex-1 lg:min-h-0">
        <div className="min-w-0 px-4 sm:px-8 py-[26px] lg:overflow-y-auto">
          <CalculatorForm context={run.context} results="pane" className="max-w-[760px] gap-[26px]" />
        </div>
        <div className="px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
          <CalculatorLivePane context={run.context} onSend={() => setSending(true)} />
        </div>
      </div>

      <SendToQuoteDialog
        isOpen={sending}
        onClose={() => setSending(false)}
        calculator={calculator}
        values={run.values}
        result={run.result}
        library={library}
      />
    </div>
  );
}

// The quick view beside the calculator list (mockup 6b): the run view at phone width, with the
// form scrolling above a pinned footer of live results and the total.
export function CalculatorQuickView({ calculator, library }: { calculator: Calculator; library: CalculatorLibrary }) {
  const router = useRouter();
  const useOnly = useUseOnlyMode();
  const [sending, setSending] = useState(false);
  const run = useCalculatorRun(calculator, library, 'compact');
  const fullHref = `/calculator?id=${encodeURIComponent(calculator.id)}`;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px] flex flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-bold tracking-[-.02em] text-ink">{calculator.name}</h2>
            {calculator.description && <p className="mt-0.5 text-[13px] text-ink-muted">{calculator.description}</p>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={run.reset} disabled={!run.hasValues} className="px-2">
              Reset
            </Button>
            {!useOnly && (
              <Button variant="secondary" size="sm" onClick={() => router.push(editHref(calculator))}>
                Edit
              </Button>
            )}
            <Link
              href={fullHref}
              title="Open full size"
              aria-label={`Open ${calculator.name} full size`}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border-strong text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <CalculatorForm context={run.context} results="pane" className="gap-4" />
      </div>
      <CalculatorLivePane context={run.context} onSend={() => setSending(true)} layout="compact" />

      <SendToQuoteDialog
        isOpen={sending}
        onClose={() => setSending(false)}
        calculator={calculator}
        values={run.values}
        result={run.result}
        library={library}
      />
    </div>
  );
}
