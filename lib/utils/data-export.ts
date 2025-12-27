import { CalculationModule, Material, ModuleTemplate } from '../types';
import { useModulesStore } from '../stores/modules-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useTemplatesStore } from '../stores/templates-store';

export interface ExportedData {
  version: string;
  exportedAt: string;
  modules: CalculationModule[];
  materials: Material[];
  customCategories: string[];
  templates: ModuleTemplate[];
}

const EXPORT_VERSION = '1.0.0';

/**
 * Export all application data (Modules, Materials, Categories, Templates)
 * Excludes Quotes as per user requirement
 */
export function exportAllData(): ExportedData {
  const modules = useModulesStore.getState().modules;
  const materials = useMaterialsStore.getState().materials;
  const customCategories = useCategoriesStore.getState().customCategories;
  const templates = useTemplatesStore.getState().templates;

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    modules,
    materials,
    customCategories,
    templates,
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

