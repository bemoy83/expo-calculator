import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleTemplate } from '../types';
import { generateId } from '../utils';

interface TemplatesStore {
  templates: ModuleTemplate[];
  addTemplate: (template: Omit<ModuleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => ModuleTemplate;
  updateTemplate: (id: string, updates: Partial<ModuleTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => ModuleTemplate | undefined;
}

export const useTemplatesStore = create<TemplatesStore>()(
  persist(
    (set, get) => ({
      templates: [],
      
      addTemplate: (templateData) => {
        const now = new Date().toISOString();
        const newTemplate: ModuleTemplate = {
          ...templateData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
        return newTemplate;
      },
      
      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: new Date().toISOString() }
              : template
          ),
        }));
      },
      
      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== id),
        }));
      },
      
      getTemplate: (id) => {
        return get().templates.find((template) => template.id === id);
      },
    }),
    {
      name: 'templates-store',
    }
  )
);

