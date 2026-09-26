'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ModalDialog } from '@/components/shared/ModalDialog';
import type { CalculatorLibrary, CalculatorResult, CalculatorValues, Calculator } from '@/lib/calculator/types';
import { buildCalculatorLineItem } from '@/lib/quotes/calculator-line-item';
import { DEFAULT_QUOTE_NAME, getBoardQuotes } from '@/lib/quotes/quote-board';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { notify } from '@/lib/stores/notifications-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';

const NEW_QUOTE = 'new';

// Adds the calculator's result to a quote as a line: an existing quote or a new one, with an
// optional label (e.g. "North wall"). Opened from a quote line with Edit, it offers to update
// that line instead of adding another.
export function SendToQuoteDialog({
  isOpen,
  onClose,
  calculator,
  values,
  result,
  library,
}: {
  isOpen: boolean;
  onClose: () => void;
  calculator: Calculator;
  values: CalculatorValues;
  result: CalculatorResult;
  library: CalculatorLibrary;
}) {
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);
  const savedQuotes = useQuotesStore((state) => state.quotes);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const sendToQuote = useQuotesStore((state) => state.sendToQuote);
  const origin = useCalculatorSessionStore((state) => state.origins[calculator.id]);
  const clearOrigin = useCalculatorSessionStore((state) => state.clearOrigin);

  const quotes = useMemo(() => getBoardQuotes(savedQuotes, currentQuote), [savedQuotes, currentQuote]);
  const originQuote = origin ? quotes.find((quote) => quote.id === origin.quoteId) : undefined;
  const originLine = originQuote?.lineItems.find((item) => item.id === origin?.lineItemId);

  const [target, setTarget] = useState(NEW_QUOTE);
  const [newName, setNewName] = useState('');
  const [nickname, setNickname] = useState('');
  const [replace, setReplace] = useState(true);

  // Start each time from the line it was opened from, else the most recently edited quote.
  useEffect(() => {
    if (!isOpen) return;
    setTarget(originQuote?.id ?? quotes[0]?.id ?? NEW_QUOTE);
    setNewName(DEFAULT_QUOTE_NAME);
    setNickname(originLine?.nickname ?? '');
    setReplace(true);
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const replacing = !!originLine && target === originQuote?.id && replace;
  const cost = result.quoteCost;

  const send = () => {
    const outcome = buildCalculatorLineItem({ calculator, values, result, library, formatMoney, nickname });
    if (!outcome.ok) {
      notify({ variant: 'error', message: outcome.error });
      return;
    }
    const quote = sendToQuote(
      target === NEW_QUOTE
        ? { newQuoteName: newName }
        : { quoteId: target, replaceLineItemId: replacing ? originLine!.id : undefined },
      outcome.lineItem
    );
    if (!quote) {
      notify({ variant: 'error', message: 'That quote no longer exists.' });
      return;
    }
    clearOrigin(calculator.id);
    notify({
      variant: 'success',
      message: `${replacing ? 'Updated' : 'Added'} ${calculator.name} (${formatMoney(outcome.lineItem.cost)}) ${replacing ? 'in' : 'to'} “${quote.name}”.`,
    });
    onClose();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title="Send to quote" maxWidth="medium">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="flex items-baseline justify-between gap-3 rounded-md bg-sunken px-3 py-2.5">
          <span className="text-sm text-ink-body">{calculator.name}</span>
          <span className="font-numeric text-base font-semibold text-ink">{cost !== undefined ? formatMoney(cost) : '—'}</span>
        </div>

        <Select
          label="Quote"
          value={target}
          data-autofocus
          options={[
            ...quotes.map((quote) => ({ value: quote.id, label: `${quote.name} · ${formatMoney(quote.total)}` })),
            { value: NEW_QUOTE, label: 'New quote…' },
          ]}
          onChange={(event) => setTarget(event.target.value)}
        />
        {target === NEW_QUOTE && (
          <Input label="Name of the new quote" value={newName} onChange={(event) => setNewName(event.target.value)} />
        )}
        {originLine && target === originQuote?.id && (
          <Checkbox
            label={`Update the line it was opened from (${formatMoney(originLine.cost)}) instead of adding another`}
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
          />
        )}
        <Input
          label="Label (optional)"
          value={nickname}
          placeholder="e.g. North wall"
          onChange={(event) => setNickname(event.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={cost === undefined}>
            {replacing ? 'Update line' : 'Add to quote'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
