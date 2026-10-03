import './memory-local-storage';
import { useCalculatorsStore } from '../stores/calculators-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useMaterialsStore } from '../stores/materials-store';
import { EXPORT_VERSION, exportAllData, type ExportedData } from '../utils/data-export';
import { importData, validateImportedData } from '../utils/data-import';
import { partitionWall } from './calculator-fixtures';
import { sharedFunctions, templateLabor, templateMaterials } from './fixtures';
import { assertCheck } from './test-helpers';

console.log('\n=== Data Export/Import Regression ===');

// Three calculators with their own ids and names.
const calculators = [
  partitionWall,
  { ...partitionWall, id: 'second-wall', name: 'Second wall' },
  { ...partitionWall, id: 'third-wall', name: 'Third wall' },
];

// ---- Export and import ----

const seed = () => {
  useMaterialsStore.setState({ materials: templateMaterials });
  useLaborStore.setState({ labor: templateLabor });
  useFunctionsStore.setState({ functions: sharedFunctions });
  useCategoriesStore.setState({ customCategories: ['Walls'] });
  useCalculatorsStore.setState({ calculators });
};
seed();
const exported = exportAllData();
assertCheck(
  'exports calculators, functions, materials, labor and categories, and no modules or templates',
  exported.version === EXPORT_VERSION &&
    exported.calculators?.length === calculators.length &&
    exported.functions?.length === sharedFunctions.length &&
    !('modules' in exported) &&
    !('templates' in exported) &&
    validateImportedData(JSON.parse(JSON.stringify(exported)))
);

useCalculatorsStore.setState({ calculators: [] });
useMaterialsStore.setState({ materials: [] });
const replaced = importData(JSON.parse(JSON.stringify(exported)) as ExportedData, { mode: 'replace' });
assertCheck(
  'replace brings the calculators back with the same ids',
  replaced.success &&
    replaced.calculatorsAdded === calculators.length &&
    useCalculatorsStore.getState().calculators.map((calculator) => calculator.id).join(',') ===
      calculators.map((calculator) => calculator.id).join(','),
  JSON.stringify(replaced)
);

const renamed = { ...calculators[0], id: 'other-id' };
const merged = importData({ ...exported, calculators: [...calculators, renamed, { ...calculators[0], id: 'new-id', name: 'Brand new' }] }, { mode: 'merge' });
assertCheck(
  'merge adds only calculators whose id and name are both new',
  merged.calculatorsAdded === 1 &&
    useCalculatorsStore.getState().calculators.some((calculator) => calculator.name === 'Brand new') &&
    !useCalculatorsStore.getState().calculators.some((calculator) => calculator.id === 'other-id'),
  JSON.stringify(merged)
);

// A file from before calculators carries modules and templates, which can no longer be imported.
const oldFile = {
  version: '1.1.0',
  exportedAt: '',
  modules: [{ id: 'old-module', name: 'Old module', fields: [], formula: 'width * 2' }],
  templates: [{ id: 'old-template', name: 'Old template', moduleInstances: [{ moduleId: 'old-module' }] }],
  materials: templateMaterials,
  labor: templateLabor,
  functions: sharedFunctions,
  customCategories: [],
} as unknown as ExportedData;
useCalculatorsStore.setState({ calculators });
const fromOldFile = importData(oldFile, { mode: 'replace' });
assertCheck(
  'an old file still imports its materials, labor and functions, keeps the calculators, and says its modules cannot be imported',
  validateImportedData(oldFile) &&
    fromOldFile.success &&
    fromOldFile.calculatorsAdded === 0 &&
    useCalculatorsStore.getState().calculators.length === calculators.length &&
    (fromOldFile.warnings ?? []).some((warning) => warning.includes('before calculators') && warning.includes('can no longer be imported')),
  JSON.stringify(fromOldFile)
);

const noCalculators = { version: '1.0.0', exportedAt: '', materials: templateMaterials, customCategories: [] };
const kept = importData(noCalculators, { mode: 'replace' });
assertCheck(
  'a file without calculators leaves the calculators as they are',
  kept.success && useCalculatorsStore.getState().calculators.length === calculators.length &&
    (kept.warnings ?? []).some((warning) => warning.includes('kept'))
);
assertCheck(
  'rejects files with malformed calculators',
  !validateImportedData({ ...exported, calculators: [{ id: 'x', name: 'No steps' }] })
);
