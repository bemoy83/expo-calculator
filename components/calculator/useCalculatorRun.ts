'use client';

import { useMemo } from 'react';
import type { FieldSize } from '@/components/ui/field-styles';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import type { Calculator, CalculatorLibrary, CalculatorValues } from '@/lib/calculator/types';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useLayoutContext } from './CalculatorForm';

const EMPTY_VALUES: CalculatorValues = {};

/** A calculator as staff run it: this visit's values, the live result, and the layout context. */
export function useCalculatorRun(calculator: Calculator, library: CalculatorLibrary, fieldSize?: FieldSize) {
  const values = useCalculatorSessionStore((state) => state.values[calculator.id]) ?? EMPTY_VALUES;
  const setValue = useCalculatorSessionStore((state) => state.setValue);
  const resetValues = useCalculatorSessionStore((state) => state.reset);
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);

  const result = useMemo(() => evaluateCalculator(calculator, values, library), [calculator, values, library]);
  const hasValues = Object.values(values).some((value) => value !== undefined);
  const context = useLayoutContext({
    calculator,
    values,
    result,
    library,
    formatMoney,
    fieldSize,
    onValueChange: (key, value) => setValue(calculator.id, key, value),
  });

  return { values, result, context, hasValues, formatMoney, reset: () => resetValues(calculator.id) };
}
