import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CategoriesStore {
  customCategories: string[];
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  getAllCategories: () => string[];
}

const DEFAULT_CATEGORIES = [
  'Foundation',
  'Framing',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Labor',
  'Materials',
  'Other'
];

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set, get) => ({
      customCategories: [],
      
      addCategory: (category) => {
        const trimmed = category.trim();
        if (!trimmed) return;
        
        const current = get().customCategories;
        if (!current.includes(trimmed)) {
          set({ customCategories: [...current, trimmed] });
        }
      },
      
      removeCategory: (category) => {
        set((state) => ({
          customCategories: state.customCategories.filter(c => c !== category),
        }));
      },
      
      getAllCategories: () => {
        const custom = get().customCategories;
        const all = [...DEFAULT_CATEGORIES, ...custom];
        return Array.from(new Set(all)).sort();
      },
    }),
    {
      name: 'categories-store',
    }
  )
);








