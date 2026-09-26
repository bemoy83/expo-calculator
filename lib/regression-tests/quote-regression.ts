import './memory-local-storage';
import { calculateQuoteTotals } from '../calculations/money';
import { buildQuoteExportData, buildQuotePrintHtml, getQuoteExportFileName } from '../quotes/export';
import {
  filterQuotesByName,
  formatEditedAt,
  getBoardQuotes,
  isPristineQuote,
  stashQuote,
} from '../quotes/quote-board';
import { withoutDrafts } from '../stores/quotes-store';
import type { Quote, QuoteLineItem } from '../types';
import { assert, assertCheck } from './test-helpers';

console.log('\n=== Quote Totals Regression ===');
const lineItems: QuoteLineItem[] = [
  {
    id: 'li-1',
    moduleId: 'm-1',
    moduleName: 'Module 1',
    fieldValues: {},
    fieldSummary: '',
    cost: 10.005,
    createdAt: '',
  },
  {
    id: 'li-2',
    moduleId: 'm-2',
    moduleName: 'Module 2',
    fieldValues: {},
    fieldSummary: '',
    cost: 20.005,
    createdAt: '',
  },
];
const totals = calculateQuoteTotals({ lineItems, markupPercent: 10, taxRate: 0.25 });
assert.deepEqual(totals, {
  subtotal: 30.01,
  markupAmount: 3,
  taxAmount: 8.25,
  total: 41.26,
});
console.log(`✓ totals = ${JSON.stringify(totals)}`);

console.log('\n=== Quote Board Regression ===');
const boardQuote = (id: string, overrides: Partial<Quote> = {}): Quote => ({
  id,
  name: `Quote ${id}`,
  lineItems: [],
  subtotal: 0,
  markupPercent: 0,
  markupAmount: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});
const pristineQuote = boardQuote('pristine', { name: 'New Quote' });
const savedOld = boardQuote('old', { updatedAt: '2026-08-28T10:00:00.000Z' });
const savedNew = boardQuote('new', { updatedAt: '2026-09-18T10:00:00.000Z' });
const openCopyOfOld = {
  ...savedOld,
  name: 'Old, edited',
  lineItems: [lineItems[0]],
  updatedAt: '2026-09-23T10:00:00.000Z',
};

assertCheck(
  'treats an empty, unsaved, unnamed quote as pristine only',
  isPristineQuote(pristineQuote, []) &&
    !isPristineQuote(pristineQuote, [pristineQuote]) &&
    !isPristineQuote({ ...pristineQuote, name: 'Hall B' }, []) &&
    !isPristineQuote({ ...pristineQuote, lineItems: [lineItems[0]] }, [])
);

const savedList = [savedOld, savedNew];
assertCheck(
  'stashing skips pristine quotes, appends new ones, and replaces saved copies',
  stashQuote(savedList, pristineQuote) === savedList &&
    stashQuote(savedList, null) === savedList &&
    stashQuote(savedList, boardQuote('fresh', { name: 'Fresh' })).length === 3 &&
    stashQuote(savedList, openCopyOfOld).length === 2 &&
    stashQuote(savedList, openCopyOfOld)[0].name === 'Old, edited'
);

const board = getBoardQuotes(savedList, openCopyOfOld);
assertCheck(
  'board shows the open quote live, once, sorted by most recently edited',
  board.map((quote) => quote.id).join(',') === 'old,new' && board[0].name === 'Old, edited'
);
assertCheck(
  'board leaves out a pristine open quote',
  getBoardQuotes(savedList, pristineQuote).map((quote) => quote.id).join(',') === 'new,old'
);

assertCheck(
  'filters quotes by name, case-insensitively',
  filterQuotesByName(board, '  EDITED ').length === 1 && filterQuotesByName(board, '').length === 2
);

const now = new Date('2026-09-23T12:00:00.000Z');
assertCheck(
  'formats edited times relative, then as a date',
  formatEditedAt('2026-09-23T11:59:40.000Z', now) === 'just now' &&
    formatEditedAt('2026-09-23T11:48:00.000Z', now) === '12 min ago' &&
    formatEditedAt('2026-09-23T09:00:00.000Z', now) === '3 h ago' &&
    formatEditedAt('2026-09-18T09:00:00.000Z', now) === '18 Sep' &&
    formatEditedAt('2025-09-18T09:00:00.000Z', now) === '18 Sep 2025' &&
    formatEditedAt('not a date', now) === ''
);

console.log('\n=== Quote UI Helper Regression ===');
const exportQuote: Quote = {
  id: 'quote-export',
  name: 'Export Quote',
  lineItems: [
    {
      id: 'line-item',
      moduleId: 'source-module',
      moduleName: 'Source',
      fieldValues: { width: 2, unknown_field: 'kept' },
      fieldSummary: 'Width: 2 m',
      cost: 10.005,
      createdAt: '',
    },
  ],
  subtotal: 10.005,
  markupPercent: 10,
  markupAmount: 1.005,
  taxRate: 0.25,
  taxAmount: 2.75,
  total: 13.76,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '',
};
const exportData = buildQuoteExportData({ quote: exportQuote });
const calculatorLineExport = buildQuoteExportData({
  quote: {
    ...exportQuote,
    lineItems: [{ ...exportQuote.lineItems[0], details: [{ label: 'Width', value: '2 m' }] }],
  },
});
assertCheck(
  'builds quote JSON export payload: shown details for calculator lines, values by name for old ones',
  exportData.quote.name === 'Export Quote' &&
    exportData.quote.lineItems[0].fields[0].label === 'width' &&
    exportData.quote.lineItems[0].fields[1].label === 'unknown_field' &&
    calculatorLineExport.quote.lineItems[0].fields[0].value === '2 m' &&
    exportData.quote.lineItems[0].cost === 10.01 &&
    exportData.quote.taxRate === 25 &&
    exportData.quote.total === 13.76
);

const quotePrintHtml = buildQuotePrintHtml({
  quote: exportQuote,
  formatCurrency: (amount) => `$${amount.toFixed(2)}`,
});
assertCheck(
  'builds quote print HTML with totals and optional markup',
  quotePrintHtml.includes('<title>Quote: Export Quote</title>') &&
    quotePrintHtml.includes('<td>Source</td>') &&
    quotePrintHtml.includes('Width: 2 m') &&
    quotePrintHtml.includes('Markup (10.00%)') &&
    quotePrintHtml.includes('Tax (25.00%)') &&
    quotePrintHtml.includes('<strong>$13.76</strong>')
);
const escapedQuotePrintHtml = buildQuotePrintHtml({
  quote: {
    ...exportQuote,
    name: '<img src=x onerror=alert(1)>',
    lineItems: [
      {
        ...exportQuote.lineItems[0],
        moduleName: '<script>alert(1)</script>',
        fieldSummary: 'Width < 5 & height > 2',
      },
    ],
  },
  formatCurrency: (amount) => `$${amount.toFixed(2)}`,
});
assertCheck(
  'escapes quote print HTML text',
  escapedQuotePrintHtml.includes('&lt;img src=x onerror=alert(1)&gt;') &&
    escapedQuotePrintHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;') &&
    escapedQuotePrintHtml.includes('Width &lt; 5 &amp; height &gt; 2') &&
    !escapedQuotePrintHtml.includes('<script>alert(1)</script>')
);
const nicknamedExportQuote: Quote = {
  ...exportQuote,
  lineItems: [{ ...exportQuote.lineItems[0], nickname: 'North <wall>' }],
};
assertCheck(
  'includes line item nicknames in JSON export and escaped print HTML',
  buildQuoteExportData({ quote: nicknamedExportQuote }).quote.lineItems[0]
    .nickname === 'North <wall>' &&
    buildQuotePrintHtml({
      quote: nicknamedExportQuote,
      formatCurrency: (amount) => `$${amount.toFixed(2)}`,
    }).includes('<td>Source · North &lt;wall&gt;</td>')
);
assertCheck(
  'builds quote JSON export file names',
  getQuoteExportFileName('My Quote Name') === 'My_Quote_Name_quote.json'
);


console.log('\n=== Old Quote Drafts Regression ===');
const withOldDrafts = withoutDrafts({
  quotes: [
    { ...boardQuote('a', { name: 'Hall A', lineItems: [lineItems[0]] }), workspaceModules: [{ id: 'draft' }] },
    { ...boardQuote('b', { name: 'Hall B' }), workspaceModules: [] },
  ],
  currentQuote: { ...boardQuote('a', { name: 'Hall A' }), workspaceModules: [{ id: 'draft' }] },
});
assertCheck(
  "drops the old builder's drafts from saved and open quotes, naming the quotes that had them, and keeps lines",
  withOldDrafts.quotes.every((quote) => !('workspaceModules' in quote)) &&
    withOldDrafts.currentQuote !== null &&
    !('workspaceModules' in withOldDrafts.currentQuote) &&
    withOldDrafts.quotes[0].lineItems.length === 1 &&
    withOldDrafts.withDrafts.join(',') === 'Hall A',
  JSON.stringify(withOldDrafts)
);
