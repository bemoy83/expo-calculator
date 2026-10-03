import { useEffect, useMemo, useState } from 'react';
import { prettifyFormula } from '@/lib/formula/prettify';

/** How long a formula rests before a tidy-up is offered. */
const OFFER_AFTER_MS = 1000;

/**
 * Spacing that could be tidied is offered after a moment of rest, not applied under the cursor.
 * `apply` puts the tidied formula in (the editor does it as one undo step, the caret kept by the
 * same characters).
 */
export function useTidyOffer({ formula, apply }: { formula: string; apply: (tidied: string) => void }) {
  const tidied = useMemo(() => prettifyFormula(formula), [formula]);
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    setOffered(false);
    if (tidied === formula) return;
    const timer = setTimeout(() => setOffered(true), OFFER_AFTER_MS);
    return () => clearTimeout(timer);
  }, [formula, tidied]);

  return { tidied, show: offered && tidied !== formula, apply: () => apply(tidied) };
}
