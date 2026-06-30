import { roundMoney } from "../calculations/money";
import type { CalculationModule, Quote } from "../types";

export function buildQuoteExportData(input: {
  quote: Quote;
  getModule: (id: string) => CalculationModule | undefined;
}) {
  return {
    quote: {
      name: input.quote.name,
      createdAt: input.quote.createdAt,
      lineItems: input.quote.lineItems.map((item) => ({
        moduleName: item.moduleName,
        fields: Object.entries(item.fieldValues).map(([key, value]) => {
          const moduleDef = input.getModule(item.moduleId);
          const field = moduleDef?.fields.find((candidate) => candidate.variableName === key);
          return {
            label: field?.label || key,
            value,
          };
        }),
        cost: roundMoney(item.cost),
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
  let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote: ${quote.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .right-align { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${quote.name}</h1>
        <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Details</th>
              <th class="right-align">Cost</th>
            </tr>
          </thead>
          <tbody>
    `;

  quote.lineItems.forEach((item) => {
    html += `
        <tr>
          <td>${item.moduleName}</td>
          <td>${item.fieldSummary}</td>
          <td class="right-align">${formatCurrency(item.cost)}</td>
        </tr>
      `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right-align"><strong>Subtotal:</strong></td>
              <td class="right-align">${formatCurrency(quote.subtotal)}</td>
            </tr>
    `;

  if (quote.markupPercent > 0) {
    html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Markup (${quote.markupPercent.toFixed(2)}%):</strong></td>
              <td class="right-align">${formatCurrency(quote.markupAmount || 0)}</td>
            </tr>
      `;
  }

  html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Tax (${(quote.taxRate * 100).toFixed(2)}%):</strong></td>
              <td class="right-align">${formatCurrency(quote.taxAmount)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" class="right-align"><strong>Total:</strong></td>
              <td class="right-align"><strong>${formatCurrency(quote.total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

  return html;
}
