import { create } from 'zustand';
import type { CalculatorValue, CalculatorValues } from '../calculator/types';

/** The quote line a calculator was opened from with Edit, so sending can update it. */
export interface LineItemOrigin {
  quoteId: string;
  lineItemId: string;
}

// What has been typed into each calculator during this visit. Deliberately not persisted:
// a calculator opens at its defaults, and values survive moving between pages until reload.
interface CalculatorSessionStore {
  values: Record<string, CalculatorValues>;
  origins: Record<string, LineItemOrigin | undefined>;
  setValue: (calculatorId: string, key: string, value: CalculatorValue | undefined) => void;
  /** Opens a calculator with a quote line's values, remembering the line. */
  openFromLineItem: (calculatorId: string, values: CalculatorValues, origin: LineItemOrigin) => void;
  clearOrigin: (calculatorId: string) => void;
  reset: (calculatorId: string) => void;
}

export const useCalculatorSessionStore = create<CalculatorSessionStore>()((set) => ({
  values: {},
  origins: {},
  setValue: (calculatorId, key, value) =>
    set((state) => ({
      values: { ...state.values, [calculatorId]: { ...state.values[calculatorId], [key]: value } },
    })),
  openFromLineItem: (calculatorId, values, origin) =>
    set((state) => ({
      values: { ...state.values, [calculatorId]: { ...values } },
      origins: { ...state.origins, [calculatorId]: origin },
    })),
  clearOrigin: (calculatorId) =>
    set((state) => ({ origins: { ...state.origins, [calculatorId]: undefined } })),
  reset: (calculatorId) =>
    set((state) => {
      const values = { ...state.values };
      delete values[calculatorId];
      return { values, origins: { ...state.origins, [calculatorId]: undefined } };
    }),
}));
