import { buildCalculatorPack } from '../calculator/pack';
import type { Calculator } from '../calculator/types';
import { CalculationModule, Material, ModuleTemplate, SharedFunction, Labor } from '../types';
import { useCalculatorsStore } from '../stores/calculators-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useDeviceStore } from '../stores/device-store';

export interface ExportedData {
  version: string;
  /**
   * 'pack': a calculator pack for staff devices (the chosen calculators, the functions they
   * call, the catalogs); loading one replaces all of those. Unset: a full export (backup).
   */
  kind?: 'pack';
  exportedAt: string;
  materials: Material[];
  labor?: Labor[];
  customCategories: string[];
  functions?: SharedFunction[];
  /** Since 2.0.0. */
  calculators?: Calculator[];
  /** Files before 2.0.0: turned into calculators on import. */
  modules?: CalculationModule[];
  /** Files 1.1.0: turned into calculators on import. */
  templates?: ModuleTemplate[];
}

// 2.0.0: calculators replace modules and templates (older files still import; their modules
// and templates become calculators).
export const EXPORT_VERSION = '2.0.0';

/**
 * Export all application data (calculators, functions, materials, labor, categories).
 * Quotes are not exported: they stay on this device and an import leaves them alone.
 */
export function exportAllData(): ExportedData {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    calculators: useCalculatorsStore.getState().calculators,
    functions: useFunctionsStore.getState().functions,
    materials: useMaterialsStore.getState().materials,
    labor: useLaborStore.getState().labor,
    customCategories: useCategoriesStore.getState().customCategories,
  };
}

/**
 * A calculator pack of the chosen calculators, remembered as this browser's last pack export
 * (which ticks the same calculators next time and marks what changed since).
 */
export function exportCalculatorPack(calculatorIds: string[]): ExportedData {
  const pack = buildCalculatorPack(
    {
      calculators: useCalculatorsStore.getState().calculators,
      functions: useFunctionsStore.getState().functions,
      materials: useMaterialsStore.getState().materials,
      labor: useLaborStore.getState().labor,
      customCategories: useCategoriesStore.getState().customCategories,
    },
    calculatorIds,
    EXPORT_VERSION,
    new Date().toISOString()
  );
  useDeviceStore.getState().setLastPackExport({
    exportedAt: pack.exportedAt,
    calculatorIds: (pack.calculators ?? []).map((calculator) => calculator.id),
  });
  return pack;
}

/**
 * Download exported data as a JSON file
 */
export function downloadDataAsJSON(data: ExportedData, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const finalFilename =
    filename || (data.kind === 'pack' ? `calculator-pack-${dateStr}.json` : `cost-estimator-data-${dateStr}.json`);

  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
