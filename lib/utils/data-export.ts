import { CalculationModule, Material, ModuleTemplate, SharedFunction, Labor } from '../types';
import { useModulesStore } from '../stores/modules-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useTemplatesStore } from '../stores/templates-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';

export interface ExportedData {
  version: string;
  exportedAt: string;
  modules: CalculationModule[];
  materials: Material[];
  labor?: Labor[];
  customCategories: string[];
  functions?: SharedFunction[]; // Optional for backward compatibility
  templates?: ModuleTemplate[]; // Since 1.1.0; files from 1.0.0 have none
}

// 1.1.0: templates are exported (module IDs are remapped on import).
export const EXPORT_VERSION = '1.1.0';

/**
 * Export all application data (Modules, Materials, Labor, Categories, Functions, Templates).
 * Quotes are not exported: they stay on this device and an import leaves them alone.
 */
export function exportAllData(): ExportedData {
  const modules = useModulesStore.getState().modules;
  const materials = useMaterialsStore.getState().materials;
  const labor = useLaborStore.getState().labor;
  const customCategories = useCategoriesStore.getState().customCategories;
  const functions = useFunctionsStore.getState().functions;
  const templates = useTemplatesStore.getState().templates;

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    modules,
    materials,
    labor,
    customCategories,
    functions,
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

