import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Material } from '../types';
import { generateId } from '../utils';

interface MaterialsStore {
  materials: Material[];
  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  getMaterialByVariableName: (variableName: string) => Material | undefined;
}

export const useMaterialsStore = create<MaterialsStore>()(
  persist(
    (set, get) => ({
      materials: [],
      
  addMaterial: (materialData) => {
    const now = new Date().toISOString();
    const nextOrder = get().materials.length;
    const newMaterial: Material = {
      ...materialData,
      id: generateId(),
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
        set((state) => ({
          materials: [...state.materials, newMaterial],
        }));
      },
      
  updateMaterial: (id, updates) => {
    set((state) => ({
      materials: state.materials.map((material) =>
        material.id === id
          ? { ...material, ...updates, updatedAt: new Date().toISOString() }
          : material
      ),
    }));
  },
      
      deleteMaterial: (id) => {
        set((state) => ({
          materials: state.materials.filter((material) => material.id !== id),
        }));
      },
      
      getMaterial: (id) => {
        return get().materials.find((material) => material.id === id);
      },
      
      getMaterialByVariableName: (variableName) => {
        return get().materials.find((material) => material.variableName === variableName);
      },
    }),
    {
      name: 'materials-store',
    }
  )
);
