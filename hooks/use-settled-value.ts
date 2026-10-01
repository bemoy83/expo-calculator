import { useEffect, useState } from 'react';

/** The value once it has stood unchanged for `ms`; undefined as soon as it's cleared. */
export function useSettledValue<T>(value: T | undefined, ms = 700): T | undefined {
  const [settled, setSettled] = useState<T | undefined>(value);
  useEffect(() => {
    if (value === undefined) {
      setSettled(undefined);
      return;
    }
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return value === undefined ? undefined : settled;
}
