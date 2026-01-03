import { CalculationModule, Material, ModuleTemplate, SharedFunction } from '../types';
import { useModulesStore } from '../stores/modules-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useTemplatesStore } from '../stores/templates-store';
import { useFunctionsStore } from '../stores/functions-store';

export interface ExportedData {
  version: string;
  exportedAt: string;
  modules: CalculationModule[];
  materials: Material[];
  customCategories: string[];
  functions?: SharedFunction[]; // Optional for backward compatibility
  templates?: ModuleTemplate[]; // Optional for backward compatibility, but not exported/imported
}

const EXPORT_VERSION = '1.0.0';

/**
 * Export all application data (Modules, Materials, Categories, Functions)
 * Excludes Templates (module ID references break on import) and Quotes
 */
export function exportAllData(): ExportedData {
  const modules = useModulesStore.getState().modules;
  const materials = useMaterialsStore.getState().materials;
  const customCategories = useCategoriesStore.getState().customCategories;
  const functions = useFunctionsStore.getState().functions;

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    modules,
    materials,
    customCategories,
    functions,
  };
}

/**
 * Download exported data as a JSON file
 */
export function downloadDataAsJSON(data: ExportedData, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const finalFilename = filename || `cost-estimator-data-${dateStr}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

