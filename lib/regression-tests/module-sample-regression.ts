import { evaluateModuleSample, getSampleDefaults } from '../modules/module-sample';
import type { Field, Labor, Material } from '../types';
import { quoteModules, templateLabor, templateMaterials } from './fixtures';
import { assertCheck } from './test-helpers';

console.log('\n=== Module Sample Regression ===');

const pickerFields: Field[] = [
  { id: 'f-w', label: 'Width', type: 'number', variableName: 'width', defaultValue: 3 },
  { id: 'f-n', label: 'Note', type: 'text', variableName: 'note' },
  { id: 'f-m', label: 'Board', type: 'material', variableName: 'board', materialCategory: templateMaterials[0].category },
  { id: 'f-any', label: 'Any', type: 'material', variableName: 'any_material' },
  { id: 'f-l', label: 'Crew', type: 'labor', variableName: 'crew', laborCategory: 'No such category' },
  { id: 'f-blank', label: 'Unnamed', type: 'number', variableName: '' },
];
const defaults = getSampleDefaults(pickerFields, templateMaterials as Material[], templateLabor as Labor[]);
assertCheck(
  'starts samples at field defaults, with pickers on the first item in their category',
  defaults.width === 3 &&
    defaults.note === '' &&
    defaults.board === templateMaterials[0].variableName &&
    defaults.any_material === templateMaterials[0].variableName &&
    defaults.crew === '' &&
    !('' in defaults),
  JSON.stringify(defaults)
);

const source = quoteModules[0]; // formula width * 2, output area = width * 3 (m, shown in quote)
const ok = evaluateModuleSample({
  fields: source.fields,
  formula: source.formula,
  computedOutputs: source.computedOutputs ?? [],
  values: { width: 4 },
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'reports the cost and every computed output for a sample',
  ok.cost === 8 &&
    !ok.error &&
    ok.outputs.length === 1 &&
    ok.outputs[0].display === '12 m' &&
    ok.outputs[0].showInQuote,
  JSON.stringify(ok)
);

const broken = evaluateModuleSample({
  fields: source.fields,
  formula: 'width * missing_thing',
  computedOutputs: [],
  values: { width: 4 },
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  "surfaces the calculator's own error instead of a cost",
  broken.cost === undefined && (broken.error ?? '').includes('missing_thing'),
  JSON.stringify(broken)
);

const empty = evaluateModuleSample({
  fields: source.fields,
  formula: '   ',
  computedOutputs: [],
  values: {},
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck('asks for a formula when there is none', empty.cost === undefined && !!empty.error);
