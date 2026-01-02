import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalculationModule, Field } from '../types';
import { generateId } from '../utils';
import { sanitizeLegacyModule, regenerateComputedOutputVariableNames } from '../utils/computed-outputs';

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
        let newModule: CalculationModule = {
          ...moduleData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        // Sanitize legacy modules (check for fields with 'out.' prefix)
        newModule = sanitizeLegacyModule(newModule);
        // Regenerate computed output variable names if needed
        newModule = regenerateComputedOutputVariableNames(newModule);
        set((state) => ({
          modules: [...state.modules, newModule],
        }));
      },
      
      updateModule: (id, updates) => {
        set((state) => ({
          modules: state.modules.map((module) => {
            if (module.id === id) {
              let updated = { ...module, ...updates, updatedAt: new Date().toISOString() };
              // Sanitize legacy modules (check for fields with 'out.' prefix)
              updated = sanitizeLegacyModule(updated);
              // Regenerate computed output variable names if needed
              updated = regenerateComputedOutputVariableNames(updated);
              return updated;
            }
            return module;
          }),
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
      migrate: (persistedState: any, version: number) => {
        // Sanitize legacy modules on load
        if (persistedState && persistedState.modules) {
          persistedState.modules = persistedState.modules.map((module: CalculationModule) => {
            let sanitized = sanitizeLegacyModule(module);
            sanitized = regenerateComputedOutputVariableNames(sanitized);
            return sanitized;
          });
        }
        return persistedState;
      },
    }
  )
);

