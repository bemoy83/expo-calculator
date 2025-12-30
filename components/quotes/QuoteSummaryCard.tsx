"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trash2, Send, Calculator } from "lucide-react";
import { Quote } from "@/lib/types";

interface QuoteSummaryCardProps {
  quote: Quote;
  setMarkupPercent: (percent: number) => void;
  setTaxRate: (rate: number) => void;
  removeLineItem: (id: string) => void;
}

export function QuoteSummaryCard({
  quote,
  setMarkupPercent,
  setTaxRate,
  removeLineItem,
}: QuoteSummaryCardProps) {
  return (
    <Card elevation={1} className="sticky top-[88px] z-40" title="Quote Summary">
      <div className="space-y-5">
        {/* Financial Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-md-on-surface-variant shrink-0">
              Subtotal
            </label>
            <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
              <span className="font-semibold text-md-on-surface tabular-nums text-sm">
                ${quote.subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-md-on-surface-variant shrink-0">
              Markup (%)
            </label>
            <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
              <input
                type="number"
                step="1"
                min="0"
                value={Math.round(quote.markupPercent ?? 0).toString()}
                onChange={(e) => {
                  const percent = Math.round(Number(e.target.value) || 0);
                  setMarkupPercent(Math.max(0, percent));
                }}
                className="w-full text-right font-semibold text-md-on-surface tabular-nums text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0"
              />
            </div>
          </div>

          {(quote.markupPercent ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-md-on-surface-variant shrink-0">
                Markup
              </label>
              <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                <span className="font-semibold text-md-on-surface tabular-nums text-sm">
                  ${(quote.markupAmount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-md-on-surface-variant shrink-0">
              Tax Rate (%)
            </label>
            <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(quote.taxRate * 100).toString()}
                onChange={(e) => {
                  const rate = Math.round(Number(e.target.value) || 0) / 100;
                  setTaxRate(Math.max(0, Math.min(1, rate)));
                }}
                className="w-full text-right font-semibold text-md-on-surface tabular-nums text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0"
              />
            </div>
          </div>

          {(quote.taxRate ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-md-on-surface-variant shrink-0">
                Tax
              </label>
              <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                <span className="font-semibold text-md-on-surface tabular-nums text-sm">
                  ${quote.taxAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-baseline p-4 -mx-2">
            <span className="text-base font-bold text-md-on-surface">Total</span>
            <span className="text-3xl font-bold text-md-primary tabular-nums tracking-tight">
              ${quote.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="pt-5 border-t border-border">
          <h4 className="text-sm font-semibold text-md-primary mb-3">Line Items</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {quote.lineItems.map((item) => (
              <div
                key={item.id}
                className="group flex items-start justify-between gap-3 p-3 rounded-lg transition-smooth"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-md-on-surface text-sm mb-0.5 truncate">
                    {item.moduleName}
                  </div>
                  <div className="text-md-on-surface-variant text-xs truncate">
                    {item.fieldSummary}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-md-on-surface text-sm tabular-nums">
                    ${item.cost.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeLineItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-md-error/10 rounded-md text-destructive"
                    title="Remove item"
                    aria-label={`Remove line item: ${item.moduleName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            {quote.lineItems.length === 0 && (
              <div className="text-center py-8">
                <Calculator className="h-8 w-8 text-md-on-surface-variant mx-auto mb-2 opacity-50" />
                <p className="text-xs text-md-on-surface-variant">No items in quote yet.</p>
                <p className="text-xs text-md-on-surface-variant mt-1">
                  Configure modules and click &quot;Add to Quote&quot;
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-5 border-t border-border">
          <Button
            variant="primary"
            className="w-full rounded-full"
            onClick={() => {
              alert("Send Quote functionality would integrate with your email/CRM system.");
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Quote
          </Button>
        </div>
      </div>
    </Card>
  );
}
