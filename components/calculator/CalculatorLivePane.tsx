'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CommitBlock } from '@/components/live/CommitBlock';
import { LiveLabel } from '@/components/live/LiveLabel';
import { costedParts, showsStaffResults } from '@/lib/calculator/editing';
import type { LayoutRenderContext } from './CalculatorLayoutItem';
import { CalculatorResultSections, hasResultSections } from './CalculatorForm';
import { getBoardQuotes } from '@/lib/quotes/quote-board';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useUseOnlyMode } from '@/hooks/use-device';
import { cn } from '@/lib/utils';

/** Where Send to quote goes by default: the most recently edited quote. */
function useTargetQuoteName(): string | undefined {
  const savedQuotes = useQuotesStore((state) => state.quotes);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  return useMemo(() => getBoardQuotes(savedQuotes, currentQuote)[0]?.name, [savedQuotes, currentQuote]);
}

/** Each part's cost, when there's more than one part and the layout doesn't already list them. */
function usePartCosts(context: LayoutRenderContext) {
  const { calculator, result } = context;
  const hasBreakdown = calculator.layout.some((section) => section.items.some((item) => item.type === 'breakdown'));
  const parts = costedParts(
    calculator,
    calculator.parts.map((part) => part.id)
  );
  if (hasBreakdown || parts.length < 2) return [];
  return parts.map((part) => ({ id: part.id, name: part.name, cost: result.parts[part.id]?.cost }));
}

function NoResultsNote() {
  const useOnly = useUseOnlyMode();
  return (
    <p className="text-[13px] text-ink-muted">
      This calculator doesn&apos;t show any results yet.
      {useOnly ? ' Ask whoever made it to show a result and send a new pack.' : ' Edit it and tick “Show to staff” on a step.'}
    </p>
  );
}

// A calculator's live side (mockups 4a, 6b): its results as they're typed, each part's cost,
// and the inverted total with Send to quote. `full` is the run view's right pane; `compact` is
// the quick view's pinned footer.
export function CalculatorLivePane({
  context,
  onSend,
  layout = 'full',
}: {
  context: LayoutRenderContext;
  onSend: () => void;
  layout?: 'full' | 'compact';
}) {
  const { calculator, result, formatMoney } = context;
  const target = useTargetQuoteName();
  const partCosts = usePartCosts(context);
  const [resultsOpen, setResultsOpen] = useState(true);
  const amount = result.quoteCost !== undefined ? formatMoney(result.quoteCost) : '—';
  const canSend = result.quoteCost !== undefined;
  const hasResults = hasResultSections(context);

  if (layout === 'compact') {
    return (
      <div className="flex-none bg-surface border-t border-border-strong">
        {hasResults && (
          <div className="px-[22px] pt-3">
            <button
              type="button"
              onClick={() => setResultsOpen((open) => !open)}
              aria-expanded={resultsOpen}
              className="w-full flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <LiveLabel context="Result" className="text-[11px]" />
              <ChevronDown
                className={cn('ml-auto h-4 w-4 text-ink-faint transition-transform', !resultsOpen && 'rotate-180')}
                aria-hidden="true"
              />
              <span className="sr-only">{resultsOpen ? 'Hide results' : 'Show results'}</span>
            </button>
            {resultsOpen && (
              <CalculatorResultSections context={context} className="mt-2 max-h-44 overflow-y-auto gap-3 text-[13px]" />
            )}
          </div>
        )}
        <div className="px-3.5 pt-2.5 pb-3.5">
          <CommitBlock
            layout="compact"
            label="Total excl. VAT"
            amount={amount}
            actionLabel="Send to quote"
            onAction={onSend}
            actionDisabled={!canSend}
            note={target ? `→ ${target}` : '→ a new quote'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-full">
      <LiveLabel context="Result" />
      {hasResults ? <CalculatorResultSections context={context} /> : !showsStaffResults(calculator) && <NoResultsNote />}
      {partCosts.length > 0 && (
        <>
          <div className="my-0.5 border-t border-dashed border-border-strong" />
          <dl className="flex flex-col gap-3 text-sm text-ink-muted">
            {partCosts.map((part) => (
              <div key={part.id} className="flex justify-between gap-3">
                <dt>{part.name}</dt>
                <dd className="font-numeric text-ink">{part.cost !== undefined ? formatMoney(part.cost) : '—'}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <CommitBlock
        className="mt-auto"
        label="Total excl. VAT"
        amount={amount}
        actionLabel="Send to quote"
        onAction={onSend}
        actionDisabled={!canSend}
        note={target ? `Adds a line to ${target}` : 'Adds a line to a new quote'}
      />
    </div>
  );
}
