import { create } from 'zustand';
import type { CalculatorValue, CalculatorValues } from '../calculator/types';

// What has been typed into each calculator during this visit. Deliberately not persisted:
// a calculator opens at its defaults, and values survive moving between pages until reload.
interface CalculatorSessionStore {
  values: Record<string, CalculatorValues>;
  setValue: (calculatorId: string, key: string, value: CalculatorValue | undefined) => void;
  reset: (calculatorId: string) => void;
}

export const useCalculatorSessionStore = create<CalculatorSessionStore>()((set) => ({
  values: {},
  setValue: (calculatorId, key, value) =>
    set((state) => ({
      values: { ...state.values, [calculatorId]: { ...state.values[calculatorId], [key]: value } },
    })),
  reset: (calculatorId) =>
    set((state) => {
      const next = { ...state.values };
      delete next[calculatorId];
      return { values: next };
    }),
}));
