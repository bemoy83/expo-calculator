import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalculationModule, Field } from '../types';
import { generateId } from '../utils';

interface ModulesStore {
  modules: CalculationModule[];
  addModule: (module: Omit<CalculationModule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateModule: (id: string, module: Partial<CalculationModule>) => void;
  deleteModule: (id: string) => void;
  getModule: (id: string) => CalculationModule | undefined;
}

export const useModulesStore = create<ModulesStore>()(
  persist(
    (set, get) => ({
      modules: [],
      
      addModule: (moduleData) => {
        const now = new Date().toISOString();
        const newModule: CalculationModule = {
          ...moduleData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          modules: [...state.modules, newModule],
        }));
      },
      
      updateModule: (id, updates) => {
        set((state) => ({
          modules: state.modules.map((module) =>
            module.id === id
              ? { ...module, ...updates, updatedAt: new Date().toISOString() }
              : module
          ),
        }));
      },
      
      deleteModule: (id) => {
        set((state) => ({
          modules: state.modules.filter((module) => module.id !== id),
        }));
      },
      
      getModule: (id) => {
        return get().modules.find((module) => module.id === id);
      },
    }),
    {
      name: 'modules-store',
    }
  )
);

