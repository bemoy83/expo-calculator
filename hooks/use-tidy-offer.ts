import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { caretAfterTidy, prettifyFormula } from '@/lib/formula/prettify';

/** How long a formula rests before a tidy-up is offered. */
const OFFER_AFTER_MS = 1000;

/**
 * Spacing that could be tidied is offered after a moment of rest, not applied under the cursor.
 * `apply` types the tidied formula over the old text, so undo brings the spacing back, and keeps
 * the caret by the same characters. `tidying` is true while it runs: the formula's change handler
 * should skip the suggestions for that one input event.
 */
export function useTidyOffer({
  formula,
  textareaRef,
  onFormulaChange,
  onApplied,
  applyWith,
}: {
  formula: string;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onFormulaChange: (formula: string) => void;
  /** After the tidy has gone in, e.g. to close a suggestion list */
  onApplied?: () => void;
  /** A different way to put the tidied text in (an editor that isn't a textarea, with its own undo) */
  applyWith?: (tidied: string) => void;
}) {
  const tidied = useMemo(() => prettifyFormula(formula), [formula]);
  const [offered, setOffered] = useState(false);
  const tidying = useRef(false);

  useEffect(() => {
    setOffered(false);
    if (tidied === formula) return;
    const timer = setTimeout(() => setOffered(true), OFFER_AFTER_MS);
    return () => clearTimeout(timer);
  }, [formula, tidied]);

  const apply = useCallback(() => {
    if (applyWith) {
      applyWith(tidied);
      onApplied?.();
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    const caret = caretAfterTidy(formula, el.selectionStart, tidied);
    el.focus();
    el.select();
    tidying.current = true;
    if (!document.execCommand('insertText', false, tidied)) onFormulaChange(tidied);
    tidying.current = false;
    el.setSelectionRange(caret, caret);
    onApplied?.();
  }, [formula, tidied, textareaRef, onFormulaChange, onApplied, applyWith]);

  return { tidied, show: offered && tidied !== formula, apply, tidying };
}
