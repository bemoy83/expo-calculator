import { Quote, QuoteLineItem } from '../types';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round((value || 0) * 10000) / 10000;
}

export function calculateQuoteTotals(input: {
  lineItems: QuoteLineItem[];
  markupPercent: number;
  taxRate: number;
}): Pick<Quote, 'subtotal' | 'markupAmount' | 'taxAmount' | 'total'> {
  const subtotal = roundMoney(input.lineItems.reduce((sum, item) => sum + item.cost, 0));
  const markupAmount = roundMoney(subtotal * ((input.markupPercent || 0) / 100));
  const taxAmount = roundMoney((subtotal + markupAmount) * (input.taxRate || 0));

  return {
    subtotal,
    markupAmount,
    taxAmount,
    total: roundMoney(subtotal + markupAmount + taxAmount),
  };
}
