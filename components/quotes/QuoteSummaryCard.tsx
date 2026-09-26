"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Quote, QuoteLineItem } from "@/lib/types";
import { formatInstanceLabel } from "@/lib/quotes/nickname";
import { useCurrencyStore } from "@/lib/stores/currency-store";

type RateFormData = { taxRate: number; markupPercent: number };

interface QuoteSummaryCardProps {
  quote: Quote;
  /** Markup and VAT as edited (percent); the builder's form state, so typing isn't reformatted. */
  formData: RateFormData;
  onFormDataChange: (updates: Partial<RateFormData>) => void;
  removeLineItem: (id: string) => void;
  /** Opens a calculator line in its calculator with its values. */
  editLineItem?: (item: QuoteLineItem) => void;
  canEditLineItem?: (item: QuoteLineItem) => boolean;
  /** Shown when there are no line items. */
  emptyMessage?: string;
  onExport: () => void;
}

const toRate = (raw: string) => Math.round((parseFloat(raw) || 0) * 100) / 100;

// The sealed quote (mockup 2a): a raised sheet with a green "in the quote" seal. Only line
// items count toward the total; the last line calls out what's still on the workspace bench.
export function QuoteSummaryCard({
  quote,
  formData,
  onFormDataChange,
  removeLineItem,
  editLineItem,
  canEditLineItem,
  emptyMessage = "No lines yet. Open a calculator, fill it in, and use Send to quote.",
  onExport,
}: QuoteSummaryCardProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const itemCount = quote.lineItems.length;

  return (
    <section
      aria-labelledby="quote-sheet-heading"
      className="lg:sticky lg:top-sticky-offset flex flex-col rounded-[10px] bg-surface border border-border-strong shadow-panel overflow-hidden lg:max-h-[calc(100vh-var(--app-header-h)-3rem)]"
    >
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
        <span className="h-2 w-2 rounded-full bg-committed-solid" aria-hidden="true" />
        <h2 id="quote-sheet-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-committed">
          In the quote
        </h2>
        <span className="text-[11px] font-numeric text-ink-muted">
          {itemCount} {itemCount === 1 ? "line item" : "line items"}
        </span>
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto" aria-label="Line items">
        {quote.lineItems.map((item) => {
          const itemName = formatInstanceLabel(item.moduleName, item.nickname);
          return (
            <li
              key={item.id}
              className="group flex items-start gap-3 px-4 py-3 border-b border-sunken-2 last:border-b-0 hover:bg-surface-hover focus-within:bg-surface-hover"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink break-words">
                  {item.moduleName}
                  {item.nickname && (
                    <span className="text-[11.5px] font-normal font-numeric text-ink-muted"> · {item.nickname}</span>
                  )}
                </p>
                {item.primarySummary && (
                  <p className="text-[11.5px] leading-normal font-numeric text-ink-body break-words">{item.primarySummary}</p>
                )}
                <p className="text-[10.5px] leading-normal font-numeric text-ink-faint break-words">
                  {item.secondarySummary || item.fieldSummary}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium font-numeric text-ink">{formatCurrency(item.cost)}</p>
                <div className="flex gap-2 justify-end mt-1">
                  {editLineItem && (
                    <button
                      type="button"
                      onClick={() => editLineItem(item)}
                      disabled={canEditLineItem ? !canEditLineItem(item) : false}
                      className="row-action transition-opacity rounded px-0.5 text-[11px] font-medium text-action hover:underline disabled:text-ink-faint disabled:no-underline disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                      title={
                        canEditLineItem && !canEditLineItem(item)
                          ? item.calculatorId
                            ? "This line's calculator no longer exists"
                            : 'Lines from the old quote builder can’t be edited'
                          : 'Open in its calculator with these values'
                      }
                      aria-label={`Edit line item in its calculator: ${itemName}`}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="row-action transition-opacity rounded px-0.5 text-[11px] font-medium text-danger hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    aria-label={`Remove line item: ${itemName}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {itemCount === 0 && (
          <li className="px-4 py-8 text-center text-xs text-ink-muted">{emptyMessage}</li>
        )}
      </ul>

      <div className="shrink-0 px-4 py-3.5 bg-surface-hover border-t border-border">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[12.5px] text-ink-body">Subtotal</span>
          <span className="text-[13.5px] font-medium font-numeric text-ink">{formatCurrency(quote.subtotal)}</span>
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
        <div className="flex items-baseline justify-between gap-3 mt-2.5 pt-3 border-t border-border-strong">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="text-[28px] leading-tight font-semibold font-numeric tracking-tight text-committed">
            {formatCurrency(quote.total)}
          </span>
        </div>
        <Button onClick={onExport} size="lg" className="w-full mt-3">
          <Printer className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Export quote
        </Button>
      </div>
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
  return (
    <div className="flex items-center justify-between gap-2.5 py-1.5">
      <label htmlFor={id} className="text-[12.5px] text-ink-body">
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center h-8 w-[78px] pl-2 pr-1 rounded-md bg-surface border border-border-strong focus-within:border-action focus-within:ring-[3px] focus-within:ring-action/20">
          <input
            id={id}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full min-w-0 bg-transparent text-[13px] font-medium font-numeric text-ink focus:outline-none"
          />
          <span className="px-1.5 py-0.5 rounded bg-sunken text-[10.5px] font-medium font-numeric text-ink-body" aria-hidden="true">
            %
          </span>
        </div>
        <span className="w-24 text-right text-[13.5px] font-medium font-numeric text-ink">{amount}</span>
      </div>
    </div>
  );
}
