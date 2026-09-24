import { describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '../functions/function-usage';
import { evaluateFunctionSample, getFunctionParamKinds } from '../functions/function-sample';
import type { CalculationModule, Material, SharedFunction } from '../types';
import { assertCheck } from './test-helpers';

console.log('\n=== Function Usage & Sample Regression ===');

const fn = (name: string, formula: string, parameters: SharedFunction['parameters'], extra: Partial<SharedFunction> = {}): SharedFunction => ({
  id: `fn-${name}`,
  name,
  displayName: name,
  formula,
  parameters,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

const studCount = fn('stud_count', 'floor(width / spacing)', [
  { name: 'width', label: 'Width', unitSymbol: 'mm' },
  { name: 'spacing', label: 'Spacing', unitSymbol: 'cm' },
]);
const wrapper = fn('studs_plus_one', 'stud_count(width, spacing) + 1', studCount.parameters);
const modules = [
  { id: 'm1', name: 'Framing', formula: 'stud_count(width, cc) * price', fields: [], computedOutputs: [] },
  { id: 'm2', name: 'Output only', formula: 'x', fields: [], computedOutputs: [{ expression: 'stud_count (w, cc)' }] },
  { id: 'm3', name: 'Look-alike', formula: 'my_stud_count(w, cc) + stud_count_total + a.stud_count(1)', fields: [], computedOutputs: [] },
] as unknown as CalculationModule[];

const usage = findFunctionUsage('stud_count', modules, [studCount, wrapper], studCount.id);
assertCheck(
  'finds calls in module formulas, computed outputs, and other functions, not look-alikes',
  usage.modules.map((m) => m.name).join(',') === 'Framing,Output only' &&
    usage.functions.map((f) => f.name).join(',') === 'studs_plus_one' &&
    describeFunctionUsage(usage) === 'Framing, Output only, studs_plus_one (function)',
  JSON.stringify(usage)
);
assertCheck('formats the call signature', formatFunctionSignature(studCount) === 'stud_count(width, spacing)');

const sample = evaluateFunctionSample({
  func: studCount,
  values: { width: '2400', spacing: '60' },
  materials: [],
  functions: [studCount],
});
assertCheck(
  'converts typed parameter units to base before evaluating (2400 mm / 60 cm → 4)',
  sample.display === '4' && !sample.error,
  JSON.stringify(sample)
);

const area = fn('area', 'width * height', [
  { name: 'width', label: 'Width', unitSymbol: 'mm' },
  { name: 'height', label: 'Height', unitSymbol: 'mm' },
], { returnUnitSymbol: 'm2' });
assertCheck(
  'shows the result in the return unit',
  evaluateFunctionSample({ func: area, values: { width: '2000', height: '3000' }, materials: [], functions: [area] }).display === '6 m2'
);

const board = {
  id: 'mat', name: 'Board', category: 'Boards', unit: 'pcs', price: 100, variableName: 'board',
  properties: [{ id: 'p', name: 'width', type: 'number', value: 1.2, unitSymbol: 'm', unitCategory: 'length', storedValue: 1.2 }],
  createdAt: '', updatedAt: '',
} as unknown as Material;
const sheets = fn('sheets_width', 'ceil(width / material.width)', [
  { name: 'width', label: 'Width', unitSymbol: 'm' },
  { name: 'material', label: 'Material' },
]);
const kinds = getFunctionParamKinds(sheets);
const sheetSample = evaluateFunctionSample({ func: sheets, values: { width: '5', material: 'board' }, materials: [board], functions: [sheets] });
assertCheck(
  'treats parameters read with dot notation as materials',
  kinds.width === 'number' && kinds.material === 'material' && sheetSample.display === '5',
  JSON.stringify({ kinds, sheetSample })
);

const missing = evaluateFunctionSample({ func: studCount, values: { width: '2400' }, materials: [], functions: [studCount] });
assertCheck('asks for missing parameter values', missing.display === undefined && (missing.error ?? '').includes('Spacing'));
