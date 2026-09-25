import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Calculator } from '../calculator/types';
import { generateId } from '../utils';

interface CalculatorsStore {
  calculators: Calculator[];
  addCalculator: (calculator: Omit<Calculator, 'id' | 'createdAt' | 'updatedAt'>) => Calculator;
  updateCalculator: (id: string, updates: Partial<Omit<Calculator, 'id' | 'createdAt'>>) => void;
  /** Saves a calculator the builder edited: replaces the one with its id, or adds it. */
  saveCalculator: (calculator: Calculator) => Calculator;
  deleteCalculator: (id: string) => void;
  getCalculator: (id: string) => Calculator | undefined;
}

export const useCalculatorsStore = create<CalculatorsStore>()(
  persist(
    (set, get) => ({
      calculators: [],

      addCalculator: (calculatorData) => {
        const now = new Date().toISOString();
        const calculator: Calculator = { ...calculatorData, id: generateId(), createdAt: now, updatedAt: now };
        set((state) => ({ calculators: [...state.calculators, calculator] }));
        return calculator;
      },

      updateCalculator: (id, updates) => {
        set((state) => ({
          calculators: state.calculators.map((calculator) =>
            calculator.id === id ? { ...calculator, ...updates, updatedAt: new Date().toISOString() } : calculator
          ),
        }));
      },

      saveCalculator: (calculator) => {
        const saved = { ...calculator, updatedAt: new Date().toISOString() };
        set((state) => ({
          calculators: state.calculators.some((existing) => existing.id === saved.id)
            ? state.calculators.map((existing) => (existing.id === saved.id ? saved : existing))
            : [...state.calculators, saved],
        }));
        return saved;
      },

      deleteCalculator: (id) => {
        set((state) => ({ calculators: state.calculators.filter((calculator) => calculator.id !== id) }));
      },

      getCalculator: (id) => get().calculators.find((calculator) => calculator.id === id),
    }),
    {
      name: 'calculators-store',
    }
  )
);
