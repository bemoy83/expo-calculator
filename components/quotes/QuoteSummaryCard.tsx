"use client";

import React from "react";
import { CommitBlock } from "@/components/live/CommitBlock";
import { LiveLabel } from "@/components/live/LiveLabel";
import { Quote } from "@/lib/types";
import { lineTitle } from "@/lib/quotes/workspace";
import { useCurrencyStore } from "@/lib/stores/currency-store";
import { normalizeNumberInput } from '@/components/ui/Input';
import { cn, shownNumberText } from '@/lib/utils';

type RateFormData = { taxRate: number; markupPercent: number };

interface QuoteSummaryCardProps {
  quote: Quote;
  /** Markup and VAT as edited (percent); the builder's form state, so typing isn't reformatted. */
  formData: RateFormData;
  onFormDataChange: (updates: Partial<RateFormData>) => void;
  /** The line open in the editor, and choosing another from the receipt. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Shown when there are no line items. */
  emptyMessage?: string;
  onExport: () => void;
}

const toRate = (raw: string) => Math.round((parseFloat(raw) || 0) * 100) / 100;

// The receipt (mockup 1a): every line with its cost, subtotal, markup and VAT typed in place,
// and the total on the inverted block with Export quote. Unfinished lines count 0 and say so.
export function QuoteSummaryCard({
  quote,
  formData,
  onFormDataChange,
  selectedId,
  onSelect,
  emptyMessage = "No lines yet. Open a calculator, fill it in, and use Send to quote.",
  onExport,
}: QuoteSummaryCardProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const itemCount = quote.lineItems.length;
  const unfinishedCount = quote.lineItems.filter((item) => item.unfinished).length;

  return (
    <section aria-labelledby="quote-sheet-heading" className="flex flex-col min-h-full">
      <h2 id="quote-sheet-heading">
        <LiveLabel context="In the quote" />
      </h2>

      <ul className="mt-4 flex flex-col gap-3.5 text-sm" aria-label="Line items">
        {quote.lineItems.map((item) => {
          const summary = item.unfinished ?? (item.primarySummary || item.secondarySummary || item.fieldSummary);
          const content = (
            <>
              <span className="min-w-0">
                <span className="block font-semibold text-ink break-words">{lineTitle(item)}</span>
                {summary && (
                  <span
                    className={cn(
                      "block mt-[3px] font-numeric text-xs break-words",
                      item.unfinished ? "text-draft" : "text-ink-faint"
                    )}
                  >
                    {summary}
                  </span>
                )}
              </span>
              {item.unfinished ? (
                <span className="flex-none text-xs text-draft whitespace-nowrap">Not finished</span>
              ) : (
                <span className="flex-none font-numeric text-ink whitespace-nowrap">{formatCurrency(item.cost)}</span>
              )}
            </>
          );
          return (
            <li key={item.id}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={item.id === selectedId || undefined}
                  className="w-full flex justify-between gap-2.5 text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  {content}
                </button>
              ) : (
                <div className="flex justify-between gap-2.5">{content}</div>
              )}
            </li>
          );
        })}
        {itemCount === 0 && <li className="py-6 text-center text-[13px] text-ink-muted">{emptyMessage}</li>}
      </ul>

      <div className="my-[18px] border-t border-dashed border-border-strong" />

      <div className="flex flex-col gap-3 text-sm text-ink-muted">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-numeric text-ink">{formatCurrency(quote.subtotal)}</span>
        </div>
        <RateRow
          label="Markup"
          value={formData.markupPercent}
          onChange={(raw) => onFormDataChange({ markupPercent: toRate(raw) })}
          amount={formatCurrency(quote.markupAmount ?? 0)}
        />
        <RateRow
          label="VAT"
          value={formData.taxRate}
          onChange={(raw) => onFormDataChange({ taxRate: toRate(raw) })}
          amount={formatCurrency(quote.taxAmount)}
        />
        {unfinishedCount > 0 && (
          <p className="text-xs text-draft">
            {unfinishedCount === 1 ? "1 line is" : `${unfinishedCount} lines are`} not finished and not counted.
          </p>
        )}
      </div>

      <CommitBlock
        className="mt-auto"
        label="Total incl. VAT"
        amount={formatCurrency(quote.total)}
        actionLabel="Export quote"
        onAction={onExport}
      />
    </section>
  );
}

function RateRow({
  label,
  value,
  onChange,
  amount,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  amount: string;
}) {
  const id = React.useId();
  const [typed, setTyped] = React.useState<string | null>(null);
  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor={id} className="flex-1">
        {label}
      </label>
      <div className="flex items-center h-7 w-[72px] pl-2 pr-1.5 rounded-sm bg-field hover:bg-field-hover focus-within:bg-field-hover focus-within:[box-shadow:var(--field-focus)] transition-[background-color,box-shadow]">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={shownNumberText(typed, value)}
          onChange={(event) => {
            normalizeNumberInput(event.target);
            setTyped(event.target.value);
            onChange(event.target.value);
          }}
          onBlur={() => setTyped(null)}
          className="w-full min-w-0 bg-transparent text-[13px] font-numeric text-ink caret-accent focus:outline-none"
        />
        <span className="font-numeric text-[13px] text-ink" aria-hidden="true">
          %
        </span>
      </div>
      <span className="w-24 text-right font-numeric text-ink">{amount}</span>
    </div>
  );
}
