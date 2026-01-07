import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Labor } from '../types';
import { generateId } from '../utils';

interface LaborStore {
  labor: Labor[];
  addLabor: (labor: Omit<Labor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLabor: (id: string, labor: Partial<Labor>) => void;
  deleteLabor: (id: string) => void;
  getLabor: (id: string) => Labor | undefined;
  getLaborByVariableName: (variableName: string) => Labor | undefined;
}

export const useLaborStore = create<LaborStore>()(
  persist(
    (set, get) => ({
      labor: [],
      
      addLabor: (laborData) => {
        const now = new Date().toISOString();
        const nextOrder = get().labor.length;
        const newLabor: Labor = {
          ...laborData,
          id: generateId(),
          order: nextOrder,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          labor: [...state.labor, newLabor],
        }));
      },
      
      updateLabor: (id, updates) => {
        set((state) => ({
          labor: state.labor.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
      },
      
      deleteLabor: (id) => {
        set((state) => ({
          labor: state.labor.filter((item) => item.id !== id),
        }));
      },
      
      getLabor: (id) => {
        return get().labor.find((item) => item.id === id);
      },
      
      getLaborByVariableName: (variableName) => {
        return get().labor.find((item) => item.variableName === variableName);
      },
    }),
    {
      name: 'labor-store',
    }
  )
);

