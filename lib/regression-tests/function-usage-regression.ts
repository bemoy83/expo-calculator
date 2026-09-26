import { describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '../functions/function-usage';
import { evaluateFunctionSample, getFunctionParamKinds } from '../functions/function-sample';
import type { Calculator } from '../calculator/types';
import type { Labor, Material, SharedFunction } from '../types';
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
const calculators = [
  { id: 'c1', name: 'Framing', steps: [{ source: { type: 'expression', expression: 'stud_count(width, cc) * lumber.price' } }] },
  { id: 'c2', name: 'Call step', steps: [{ source: { type: 'call', functionName: 'stud_count', args: {} } }] },
  { id: 'c3', name: 'Look-alike', steps: [{ source: { type: 'expression', expression: 'my_stud_count(w, cc) + stud_count_total + a.stud_count(1)' } }] },
] as unknown as Calculator[];

const usage = findFunctionUsage('stud_count', [studCount, wrapper], studCount.id, calculators);
assertCheck(
  'finds calls in calculator formulas, function-call steps, and other functions, not look-alikes',
  usage.calculators.map((c) => c.name).join(',') === 'Framing,Call step' &&
    usage.functions.map((f) => f.name).join(',') === 'studs_plus_one' &&
    describeFunctionUsage(usage) === 'Framing (calculator), Call step (calculator), studs_plus_one (function)',
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

const crewRate = fn('crew_hours', 'length / crew.m_per_hr', [
  { name: 'length', label: 'Length', unitSymbol: 'm' },
  { name: 'crew', label: 'Crew', kind: 'labor' },
]);
const crew = {
  id: 'l', name: 'Crew', category: 'Walls', cost: 600, variableName: 'crew_a',
  properties: [{ id: 'lp', name: 'm_per_hr', type: 'number', value: 4, storedValue: 4 }],
  createdAt: '', updatedAt: '',
} as unknown as Labor;
const laborSample = evaluateFunctionSample({ func: crewRate, values: { length: '10', crew: 'crew_a' }, materials: [], labor: [crew], functions: [crewRate] });
const laborMissing = evaluateFunctionSample({ func: crewRate, values: { length: '10' }, materials: [], labor: [crew], functions: [crewRate] });
assertCheck(
  'tries functions with labor parameters, asking to choose one when missing',
  laborSample.display === '2.5' && (laborMissing.error ?? '').startsWith('Choose a value for Crew'),
  JSON.stringify({ laborSample, laborMissing })
);
