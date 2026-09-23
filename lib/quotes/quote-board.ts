import { roundMoney } from '../calculations/money';
import type {
  CalculationModule,
  Labor,
  Material,
  ModuleTemplate,
  Quote,
  QuoteModuleInstance,
  SharedFunction,
} from '../types';
import { applyTemplateToQuoteWorkspace } from './template-application';

export const DEFAULT_QUOTE_NAME = 'New Quote';

function sumDraftCosts(drafts: QuoteModuleInstance[]): number {
  return roundMoney(drafts.reduce((sum, instance) => sum + (instance.calculatedCost || 0), 0));
}

export interface QuoteDraftSummary {
  count: number;
  cost: number;
}

// Drafts are workspace modules: configured but not added to the quote, so not in its total.
export function getQuoteDraftSummary(quote: Quote): QuoteDraftSummary {
  return {
    count: quote.workspaceModules.length,
    cost: sumDraftCosts(quote.workspaceModules),
  };
}

// A quote that was never saved and holds nothing the user entered. Switching away from one
// discards it instead of adding an empty "New Quote" to the board.
export function isPristineQuote(quote: Quote, savedQuotes: Quote[]): boolean {
  const name = quote.name.trim();
  return (
    quote.workspaceModules.length === 0 &&
    quote.lineItems.length === 0 &&
    (name === '' || name === DEFAULT_QUOTE_NAME) &&
    !savedQuotes.some((saved) => saved.id === quote.id)
  );
}

// Saves the open quote into the saved list (replacing its older copy) before the builder
// switches to another quote, so unsaved work is never dropped. Pristine quotes are skipped.
export function stashQuote(savedQuotes: Quote[], current: Quote | null): Quote[] {
  if (!current || isPristineQuote(current, savedQuotes)) return savedQuotes;
  const index = savedQuotes.findIndex((saved) => saved.id === current.id);
  if (index === -1) return [...savedQuotes, current];
  return savedQuotes.map((saved, i) => (i === index ? current : saved));
}

// Every quote the user has: the saved list with the open quote's live state in place of its
// saved copy, most recently edited first.
export function getBoardQuotes(savedQuotes: Quote[], current: Quote | null): Quote[] {
  return [...stashQuote(savedQuotes, current)].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
}

export function filterQuotesByName(quotes: Quote[], query: string): Quote[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return quotes;
  return quotes.filter((quote) => quote.name.toLowerCase().includes(needle));
}

// Fixed rather than locale-formatted: ICU versions disagree on abbreviations ("Sep" vs "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "just now", "12 min ago", "3 h ago", then a date: "18 Sep", with the year once it differs.
export function formatEditedAt(iso: string, now: Date = new Date()): string {
  const edited = new Date(iso);
  const minutes = Math.floor((now.getTime() - edited.getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  const date = `${edited.getDate()} ${MONTHS[edited.getMonth()]}`;
  return edited.getFullYear() === now.getFullYear() ? date : `${date} ${edited.getFullYear()}`;
}

// What a template's drafts cost when started as a new quote: the sum of its modules at the
// default field values that applying a template produces. Markup and tax are not included.
export function estimateTemplateCost(input: {
  template: ModuleTemplate;
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): number {
  const { workspaceModules } = applyTemplateToQuoteWorkspace({
    ...input,
    workspaceModules: [],
    getModule: (id) => input.modules.find((module) => module.id === id),
  });
  return sumDraftCosts(workspaceModules);
}
