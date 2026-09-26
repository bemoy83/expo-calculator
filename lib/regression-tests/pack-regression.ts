import './memory-local-storage';
import { createEmptyCalculator } from '../calculator/editing';
import {
  buildCalculatorPack,
  calculatorsNotInPack,
  comparePackDates,
  defaultPackSelection,
  functionsUsedBy,
  packStatus,
} from '../calculator/pack';
import type { Calculator, CalculatorStep } from '../calculator/types';
import { useCalculatorsStore } from '../stores/calculators-store';
import { useCategoriesStore } from '../stores/categories-store';
import { useDeviceStore } from '../stores/device-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useQuotesStore } from '../stores/quotes-store';
import type { SharedFunction } from '../types';
import { EXPORT_VERSION, exportCalculatorPack, type ExportedData } from '../utils/data-export';
import { importData, validateImportedData } from '../utils/data-import';
import { templateLabor, templateMaterials } from './fixtures';
import { assertCheck } from './test-helpers';

console.log('\n=== Calculator Pack Regression ===');

let nextId = 0;
const createId = () => `id-${++nextId}`;

const fn = (name: string, formula: string): SharedFunction => ({
  id: `fn-${name}`,
  displayName: name,
  name,
  formula,
  parameters: [{ name: 'x', label: 'X' }],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});
const functions = [
  fn('inner', 'x * 2'),
  fn('outer', 'inner(x) + 1'),
  fn('in_formula', 'x + 3'),
  fn('unused', 'x'),
  // Calls each other: must not loop.
  fn('ping', 'pong(x)'),
  fn('pong', 'ping(x)'),
];

function calculatorWith(id: string, name: string, steps: Array<Pick<CalculatorStep, 'key' | 'source'>>, updatedAt: string): Calculator {
  const calculator = createEmptyCalculator(createId, '2026-09-01T00:00:00.000Z');
  return {
    ...calculator,
    id,
    name,
    updatedAt,
    steps: steps.map((step) => ({ ...step, id: createId(), partId: calculator.parts[0].id, label: step.key })),
  };
}

const wall = calculatorWith(
  'calc-wall',
  'Wall',
  [
    { key: 'a', source: { type: 'call', functionName: 'outer', args: { x: { type: 'constant', value: 1 } } } },
    { key: 'b', source: { type: 'expression', expression: 'in_formula(a) + a' } },
  ],
  '2026-09-01T00:00:00.000Z'
);
const loop = calculatorWith(
  'calc-loop',
  'Loop',
  [{ key: 'c', source: { type: 'expression', expression: 'ping(2) + missing_fn(1)' } }],
  '2026-09-01T00:00:00.000Z'
);
const draft = calculatorWith('calc-draft', 'Draft', [], '2026-09-20T00:00:00.000Z');

const names = (list: SharedFunction[]) => list.map((func) => func.name).join(',');

assertCheck(
  'a pack takes the functions its calculators call, the ones those call, and nothing else',
  names(functionsUsedBy([wall], functions)) === 'inner,outer,in_formula',
  names(functionsUsedBy([wall], functions))
);
assertCheck(
  'functions calling each other are taken once, and unknown names are ignored',
  names(functionsUsedBy([loop], functions)) === 'ping,pong',
  names(functionsUsedBy([loop], functions))
);

const pack = buildCalculatorPack(
  { calculators: [wall, loop, draft], functions, materials: templateMaterials, labor: templateLabor, customCategories: ['Walls'] },
  ['calc-wall'],
  EXPORT_VERSION,
  '2026-09-10T12:00:00.000Z'
);
assertCheck(
  'a pack holds only the chosen calculators, with their functions and the whole catalogs',
  pack.kind === 'pack' &&
    pack.calculators?.map((calculator) => calculator.id).join(',') === 'calc-wall' &&
    names(pack.functions ?? []) === 'inner,outer,in_formula' &&
    pack.materials.length === templateMaterials.length &&
    pack.labor?.length === templateLabor.length &&
    pack.exportedAt === '2026-09-10T12:00:00.000Z' &&
    validateImportedData(JSON.parse(JSON.stringify(pack)))
);
assertCheck(
  'rejects a pack missing a kind it replaces, or an unknown kind',
  !validateImportedData({ ...pack, functions: undefined }) &&
    !validateImportedData({ ...pack, kind: 'something' } as unknown as ExportedData)
);

// ---- Choosing calculators for the next pack ----

const lastExport = { exportedAt: '2026-09-10T12:00:00.000Z', calculatorIds: ['calc-wall', 'calc-loop'] };
assertCheck(
  'the first pack ticks every calculator; later ones tick what the last pack had',
  defaultPackSelection([wall, loop, draft], undefined).join(',') === 'calc-wall,calc-loop,calc-draft' &&
    defaultPackSelection([wall, loop, draft], lastExport).join(',') === 'calc-wall,calc-loop'
);
assertCheck(
  'marks calculators new or changed since the last pack',
  packStatus(draft, lastExport) === 'new' &&
    packStatus(wall, lastExport) === 'same' &&
    packStatus({ ...wall, updatedAt: '2026-09-11T00:00:00.000Z' }, lastExport) === 'changed' &&
    packStatus(wall, undefined) === undefined
);
const loaded = { exportedAt: '2026-09-10T12:00:00.000Z', loadedAt: '2026-09-11T08:00:00.000Z', calculatorCount: 1 };
assertCheck(
  'compares an incoming pack with the loaded one',
  comparePackDates('2026-09-12T00:00:00.000Z', loaded) === 'newer' &&
    comparePackDates('2026-09-10T12:00:00.000Z', loaded) === 'same' &&
    comparePackDates('2026-09-01T00:00:00.000Z', loaded) === 'older' &&
    comparePackDates('2026-09-01T00:00:00.000Z', undefined) === 'newer'
);
assertCheck(
  'lists the calculators on the device that loading the pack removes',
  calculatorsNotInPack([wall, draft], pack).map((calculator) => calculator.id).join(',') === 'calc-draft'
);

// ---- Exporting and loading on a device ----

useCalculatorsStore.setState({ calculators: [wall, loop, draft], legacyImported: true });
useFunctionsStore.setState({ functions });
useMaterialsStore.setState({ materials: templateMaterials });
useLaborStore.setState({ labor: templateLabor });
useCategoriesStore.setState({ customCategories: ['Walls'] });
useDeviceStore.setState({ useOnly: false, loadedPack: undefined, lastPackExport: undefined });
const exportedPack = exportCalculatorPack(['calc-wall', 'calc-loop']);
assertCheck(
  'exporting a pack remembers it as the last pack export',
  useDeviceStore.getState().lastPackExport?.calculatorIds.join(',') === 'calc-wall,calc-loop' &&
    useDeviceStore.getState().lastPackExport?.exportedAt === exportedPack.exportedAt
);

// A staff device: its own calculator, functions and catalog, and a quote.
const quotesBefore = [{ id: 'q1', name: 'Smith deck' }];
useQuotesStore.setState({ quotes: quotesBefore as never });
useCalculatorsStore.setState({ calculators: [draft] });
useFunctionsStore.setState({ functions: [fn('staff_only', 'x')] });
useMaterialsStore.setState({ materials: [] });
useLaborStore.setState({ labor: [] });
const result = importData(JSON.parse(JSON.stringify(exportedPack)) as ExportedData, { mode: 'replace' });
assertCheck(
  'loading a pack replaces calculators, functions and catalogs and leaves quotes alone',
  result.success &&
    useCalculatorsStore.getState().calculators.map((calculator) => calculator.id).join(',') === 'calc-wall,calc-loop' &&
    names(useFunctionsStore.getState().functions) === 'inner,outer,in_formula,ping,pong' &&
    useMaterialsStore.getState().materials.length === templateMaterials.length &&
    useLaborStore.getState().labor.length === templateLabor.length &&
    useQuotesStore.getState().quotes === (quotesBefore as never),
  JSON.stringify(result)
);
assertCheck(
  'the device remembers the pack it loaded',
  useDeviceStore.getState().loadedPack?.exportedAt === exportedPack.exportedAt &&
    useDeviceStore.getState().loadedPack?.calculatorCount === 2
);

const backup: ExportedData = { ...exportedPack, kind: undefined };
importData(backup, { mode: 'merge' });
assertCheck('merging another file keeps the loaded pack', useDeviceStore.getState().loadedPack !== undefined);
importData(backup, { mode: 'replace' });
assertCheck(
  'replacing calculators from a file that is not a pack forgets the loaded pack',
  useDeviceStore.getState().loadedPack === undefined
);
