import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SharedFunction } from '@/lib/types';

interface FunctionsStore {
  functions: SharedFunction[];
  addFunction: (func: Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'>) => SharedFunction;
  updateFunction: (id: string, updates: Partial<SharedFunction>) => void;
  reorderFunctions: (functions: SharedFunction[]) => void;
  deleteFunction: (id: string) => void;
  getFunction: (id: string) => SharedFunction | undefined;
  getFunctionByName: (name: string) => SharedFunction | undefined;
}

export const useFunctionsStore = create<FunctionsStore>()(
  persist(
    (set, get) => ({
      functions: [],

      addFunction: (func) => {
        const now = new Date().toISOString();
        const newFunction: SharedFunction = {
          ...func,
          id: crypto.randomUUID(),
          order: func.order ?? get().functions.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          functions: [...state.functions, newFunction],
        }));

        return newFunction;
      },

      updateFunction: (id, updates) => {
        set((state) => ({
          functions: state.functions.map((func) =>
            func.id === id
              ? {
                  ...func,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : func
          ),
        }));
      },

      reorderFunctions: (orderedFunctions) => {
        set({
          functions: orderedFunctions.map((func, index) => (func.order === index ? func : { ...func, order: index })),
        });
      },

      deleteFunction: (id) => {
        set((state) => ({
          functions: state.functions.filter((func) => func.id !== id),
        }));
      },

      getFunction: (id) => {
        return get().functions.find((func) => func.id === id);
      },

      getFunctionByName: (name) => {
        return get().functions.find((func) => func.name === name);
      },
    }),
    { name: 'functions-storage' }
  )
);



