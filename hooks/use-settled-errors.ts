import { useEffect, useMemo, useState } from 'react';
import type { CalculatorResult } from '@/lib/calculator/types';
import { isStepError } from '@/lib/calculator/format';

const SETTLE_MS = 700;

/**
 * Holds a step's error back while its formula is still changing: a half-typed "width *" is
 * shown as incomplete, and turns into the error only once the same error has stood for a
 * moment. Errors already there when the page opens show at once, and a fixed formula clears at
 * once.
 */
export function useSettledErrors(result: CalculatorResult): CalculatorResult {
  const errorsOf = (current: CalculatorResult) => {
    const errors: Record<string, string | undefined> = {};
    for (const [id, step] of Object.entries(current.steps)) if (isStepError(step)) errors[id] = step.message;
    return errors;
  };
  // Step id → the error message that has stood long enough to show.
  const [confirmed, setConfirmed] = useState(() => errorsOf(result));

  useEffect(() => {
    const now = errorsOf(result);
    const stillThere = Object.fromEntries(Object.entries(confirmed).filter(([id, message]) => now[id] === message));
    const settled = Object.keys(stillThere).length === Object.keys(confirmed).length;
    const pending = Object.entries(now).filter(([id, message]) => confirmed[id] !== message);
    if (pending.length === 0) {
      if (!settled) setConfirmed(stillThere);
      return;
    }
    const timer = setTimeout(() => setConfirmed({ ...stillThere, ...Object.fromEntries(pending) }), SETTLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return useMemo(() => {
    const steps = { ...result.steps };
    let changed = false;
    for (const [id, step] of Object.entries(result.steps)) {
      if (isStepError(step) && confirmed[id] !== step.message) {
        steps[id] = { ...step, incomplete: true, message: undefined };
        changed = true;
      }
    }
    return changed ? { ...result, steps } : result;
  }, [result, confirmed]);
}
