import './memory-local-storage';
import { calculatorsFromLegacy, readLegacyStores } from '../calculator/legacy';
import { useCalculatorsStore } from '../stores/calculators-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useMaterialsStore } from '../stores/materials-store';
import type { CalculationModule, ModuleTemplate } from '../types';
import { EXPORT_VERSION, exportAllData, type ExportedData } from '../utils/data-export';
import { calculatorsInFile, importData, validateImportedData } from '../utils/data-import';
import { quoteModules, sharedFunctions, templateLabor, templateMaterials } from './fixtures';
import { assertCheck } from './test-helpers';

console.log('\n=== Retired Modules & Data Export/Import Regression ===');

const [sourceModule, targetModule] = quoteModules;
const template: ModuleTemplate = {
  id: 'tpl-chain',
  name: 'Chain',
  moduleInstances: [
    { id: 'inst-src', moduleId: sourceModule.id },
    { id: 'inst-tgt', moduleId: targetModule.id, fieldLinks: { linked_width: { moduleInstanceId: 'inst-src', fieldVariableName: 'width' } } },
  ],
  categories: [],
  createdAt: '',
  updatedAt: '',
};

// ---- Retired stores become calculators once ----

localStorage.setItem('modules-store', JSON.stringify({ state: { modules: quoteModules }, version: 0 }));
localStorage.setItem('templates-store', JSON.stringify({ state: { templates: [template] }, version: 0 }));
const legacy = readLegacyStores(localStorage);
const fromLegacy = calculatorsFromLegacy(legacy.modules, legacy.templates, []);
assertCheck(
  'reads the retired modules and templates from storage and makes a calculator of each, under the ids quote lines use',
  legacy.modules.length === quoteModules.length &&
    legacy.templates.length === 1 &&
    fromLegacy.map((calculator) => calculator.id).join(',') ===
      ['template-tpl-chain', ...quoteModules.map((module) => `module-${module.id}`)].join(','),
  fromLegacy.map((calculator) => calculator.id).join(',')
);
const savedCopy = { ...fromLegacy[1], id: 'my-copy', sourceModuleId: sourceModule.id };
const withSaved = calculatorsFromLegacy(legacy.modules, legacy.templates, [savedCopy, fromLegacy[0]]);
assertCheck(
  'skips modules and templates already saved as calculators (same id, or saved from them)',
  !withSaved.some((calculator) => calculator.id === 'template-tpl-chain' || calculator.sourceModuleId === sourceModule.id) &&
    withSaved.length === quoteModules.length - 1
);
assertCheck(
  'reads nothing from missing or broken storage',
  readLegacyStores({ getItem: () => null }).modules.length === 0 &&
    readLegacyStores({ getItem: () => '{not json' }).templates.length === 0
);

useCalculatorsStore.setState({ calculators: [], legacyImported: false });
useCalculatorsStore.getState().importLegacyCalculators(localStorage);
const afterFirst = useCalculatorsStore.getState().calculators.length;
useCalculatorsStore.getState().importLegacyCalculators(localStorage);
assertCheck(
  'the store turns them into saved calculators once, and not again',
  afterFirst === fromLegacy.length &&
    useCalculatorsStore.getState().calculators.length === afterFirst &&
    useCalculatorsStore.getState().legacyImported
);

// ---- Export and import ----

const seed = () => {
  useMaterialsStore.setState({ materials: templateMaterials });
  useLaborStore.setState({ labor: templateLabor });
  useFunctionsStore.setState({ functions: sharedFunctions });
  useCategoriesStore.setState({ customCategories: ['Walls'] });
  useCalculatorsStore.setState({ calculators: fromLegacy, legacyImported: true });
};
seed();
const exported = exportAllData();
assertCheck(
  'exports calculators, functions, materials, labor and categories, and no modules or templates',
  exported.version === EXPORT_VERSION &&
    exported.calculators?.length === fromLegacy.length &&
    exported.functions?.length === sharedFunctions.length &&
    exported.modules === undefined &&
    exported.templates === undefined &&
    validateImportedData(JSON.parse(JSON.stringify(exported)))
);

useCalculatorsStore.setState({ calculators: [] });
useMaterialsStore.setState({ materials: [] });
const replaced = importData(JSON.parse(JSON.stringify(exported)) as ExportedData, { mode: 'replace' });
assertCheck(
  'replace brings the calculators back with the same ids',
  replaced.success &&
    replaced.calculatorsAdded === fromLegacy.length &&
    useCalculatorsStore.getState().calculators.map((calculator) => calculator.id).join(',') ===
      fromLegacy.map((calculator) => calculator.id).join(','),
  JSON.stringify(replaced)
);

const renamed = { ...fromLegacy[0], id: 'other-id' };
const merged = importData({ ...exported, calculators: [...fromLegacy, renamed, { ...fromLegacy[0], id: 'new-id', name: 'Brand new' }] }, { mode: 'merge' });
assertCheck(
  'merge adds only calculators whose id and name are both new',
  merged.calculatorsAdded === 1 &&
    useCalculatorsStore.getState().calculators.some((calculator) => calculator.name === 'Brand new') &&
    !useCalculatorsStore.getState().calculators.some((calculator) => calculator.id === 'other-id'),
  JSON.stringify(merged)
);

const oldFile = {
  version: '1.1.0',
  exportedAt: '',
  modules: quoteModules as CalculationModule[],
  templates: [template],
  materials: templateMaterials,
  labor: templateLabor,
  functions: sharedFunctions,
  customCategories: [],
};
assertCheck(
  'reads an old file: its modules and templates are its calculators',
  validateImportedData(oldFile) &&
    calculatorsInFile(oldFile).map((calculator) => calculator.id).join(',') === fromLegacy.map((calculator) => calculator.id).join(',')
);
useCalculatorsStore.setState({ calculators: [] });
const fromOldFile = importData(oldFile, { mode: 'replace' });
assertCheck(
  'importing an old file turns its modules and templates into calculators, and says so',
  fromOldFile.success &&
    fromOldFile.calculatorsAdded === fromLegacy.length &&
    (fromOldFile.warnings ?? []).some((warning) => warning.includes('turned into calculators')),
  JSON.stringify(fromOldFile)
);

const noCalculators = { version: '1.0.0', exportedAt: '', materials: templateMaterials, customCategories: [] };
const kept = importData(noCalculators, { mode: 'replace' });
assertCheck(
  'a file without calculators leaves the calculators as they are',
  kept.success && useCalculatorsStore.getState().calculators.length === fromLegacy.length &&
    (kept.warnings ?? []).some((warning) => warning.includes('kept'))
);
assertCheck(
  'rejects files with malformed calculators',
  !validateImportedData({ ...exported, calculators: [{ id: 'x', name: 'No steps' }] })
);
