import { roundMoney } from "../calculations/money";
import type { Quote, QuoteLineItem } from "../types";
import { lineCalculatorName, lineTitle } from "./workspace";

/** A line's name as on its card: "Gable end · Wood wall", "Wood wall 2", "Wood wall". */
export function lineDisplayName(item: QuoteLineItem): string {
  const calculatorName = lineCalculatorName(item);
  return calculatorName ? `${lineTitle(item)} · ${calculatorName}` : lineTitle(item);
}

/** Lines that couldn't calculate when last edited: they count 0 and aren't in the total. */
export function unfinishedLines(quote: Quote): QuoteLineItem[] {
  return quote.lineItems.filter((item) => item.unfinished);
}

export function buildQuoteExportData(input: { quote: Quote }) {
  return {
    quote: {
      name: input.quote.name,
      createdAt: input.quote.createdAt,
      lineItems: input.quote.lineItems.map((item) => ({
        moduleName: item.moduleName,
        nickname: item.nickname,
        // Calculator lines carry what was shown; old module lines only have their values by name.
        fields: item.details ?? Object.entries(item.fieldValues).map(([label, value]) => ({ label, value })),
        cost: roundMoney(item.cost),
        ...(item.unfinished ? { unfinished: item.unfinished } : {}),
      })),
      subtotal: roundMoney(input.quote.subtotal),
      markupPercent: roundMoney(input.quote.markupPercent || 0),
      markupAmount: roundMoney(input.quote.markupAmount || 0),
      taxRate: roundMoney(input.quote.taxRate * 100),
      taxAmount: roundMoney(input.quote.taxAmount),
      total: roundMoney(input.quote.total),
    },
  };
}

export function getQuoteExportFileName(quoteName: string): string {
  return `${quoteName.replace(/\s+/g, "_")}_quote.json`;
}

export function buildQuotePrintHtml(input: {
  quote: Quote;
  formatCurrency: (amount: number) => string;
}): string {
  const { quote, formatCurrency } = input;
  const quoteName = escapeHtml(quote.name);
  let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote: ${quoteName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .right-align { text-align: right; }
          .note { color: #8a5a00; }
        </style>
      </head>
      <body>
        <h1>${quoteName}</h1>
        <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Details</th>
              <th class="right-align">Cost</th>
            </tr>
          </thead>
          <tbody>
    `;

  quote.lineItems.forEach((item) => {
    html += `
        <tr>
          <td>${escapeHtml(lineDisplayName(item))}</td>
          <td>${escapeHtml(
            item.unfinished ? item.unfinished : [item.primarySummary, item.secondarySummary || item.fieldSummary].filter(Boolean).join(' — ')
          )}</td>
          <td class="right-align">${item.unfinished ? '<em>Not finished</em>' : escapeHtml(formatCurrency(item.cost))}</td>
        </tr>
      `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right-align"><strong>Subtotal:</strong></td>
              <td class="right-align">${escapeHtml(formatCurrency(quote.subtotal))}</td>
            </tr>
    `;

  if (quote.markupPercent > 0) {
    html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Markup (${quote.markupPercent.toFixed(2)}%):</strong></td>
              <td class="right-align">${escapeHtml(formatCurrency(quote.markupAmount || 0))}</td>
            </tr>
      `;
  }

  html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Tax (${(quote.taxRate * 100).toFixed(2)}%):</strong></td>
              <td class="right-align">${escapeHtml(formatCurrency(quote.taxAmount))}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" class="right-align"><strong>Total:</strong></td>
              <td class="right-align"><strong>${escapeHtml(formatCurrency(quote.total))}</strong></td>
            </tr>
          </tfoot>
        </table>
        ${
          unfinishedLines(quote).length > 0
            ? `<p class="note"><strong>Not finished:</strong> ${unfinishedLines(quote).length === 1 ? '1 line is' : `${unfinishedLines(quote).length} lines are`} not finished and not included in the total.</p>`
            : ''
        }
      </body>
      </html>
    `;

  return html;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Saves the quote as a JSON file. */
export function downloadQuoteJson(quote: Quote) {
  const data = buildQuoteExportData({ quote });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getQuoteExportFileName(quote.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens the printable quote in a new window and prints it (or saves it as PDF). */
export function printQuote(quote: Quote, formatCurrency: (amount: number) => string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(buildQuotePrintHtml({ quote, formatCurrency }));
  printWindow.document.close();
  printWindow.print();
}
