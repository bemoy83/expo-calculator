import {
  addSuggestedParameter,
  buildFunctionSaveData,
  collectFunctionAutocompleteCandidates,
  getParameterSuggestions,
  getFormulaWithInsertedOperator,
  getFormulaWithInsertedToken,
  validateFunctionEditorForm,
} from '../functions/function-editor-helpers';
import type { Calculator } from '../calculator/types';
import type { Labor, SharedFunction } from '../types';
import { assertCheck } from './test-helpers';

console.log('\n=== Function Editor Helper Regression ===');

const inputCalculators = [
  {
    inputs: [
      { key: 'width', label: 'Width', value: { kind: 'number', unitSymbol: 'mm', unitCategory: 'length' } },
      { key: 'board', label: 'Board', value: { kind: 'material' } },
    ],
  },
  {
    inputs: [
      { key: 'depth', label: 'Depth', value: { kind: 'number' } },
      { key: 'note', label: 'Note', value: { kind: 'text' } },
    ],
  },
] as unknown as Calculator[];
const otherFunctions = [
  { id: 'self', name: 'self', parameters: [{ name: 'own', label: 'Own' }] },
  { id: 'a', name: 'a', parameters: [{ name: 'width', label: 'Wall width', unitSymbol: 'mm', unitCategory: 'length' }, { name: 'height', label: 'Height', unitSymbol: 'm' }] },
  { id: 'b', name: 'b', parameters: [{ name: 'height', label: 'Height', unitSymbol: 'mm' }] },
] as unknown as SharedFunction[];
const suggestions = getParameterSuggestions(otherFunctions, inputCalculators, 'self');
assertCheck(
  "suggests other functions' parameters, then calculator inputs, with label, unit and kind, not the function's own",
  suggestions.map((param) => `${param.name}:${param.unitSymbol ?? param.kind ?? ''}`).join(',') ===
    'board:material,depth:,height:m,height:mm,width:mm' &&
    suggestions.find((param) => param.name === 'width')?.label === 'Wall width',
  JSON.stringify(suggestions)
);

const blankStart = [{ name: '', label: '', required: true }];
const parameters = addSuggestedParameter(addSuggestedParameter(blankStart, suggestions[4]), suggestions[2]);
assertCheck(
  'adds a suggested parameter with its unit, filling the blank one first, without duplicates',
  parameters.length === 2 &&
    parameters[0].name === 'width' &&
    parameters[0].unitSymbol === 'mm' &&
    parameters[0].label === 'Wall width' &&
    parameters[1].unitSymbol === 'm' &&
    addSuggestedParameter(parameters, { ...suggestions[3], name: 'HEIGHT' }) === parameters,
  JSON.stringify(parameters)
);

const functions: SharedFunction[] = [
  {
    id: 'fn-current',
    displayName: 'Current',
    name: 'current_fn',
    formula: 'width',
    parameters: [{ name: 'width', label: 'Width' }],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fn-other',
    displayName: 'Other',
    name: 'other_fn',
    formula: 'x * 2',
    parameters: [{ name: 'x', label: 'X' }],
    createdAt: '',
    updatedAt: '',
  },
];
const labor: Labor[] = [
  {
    id: 'labor',
    name: 'Installer',
    category: 'install',
    cost: 100,
    variableName: 'installer',
    properties: [
      {
        id: 'rate',
        name: 'm2_per_hr',
        type: 'number',
        value: 12,
        unitSymbol: 'm2',
      },
    ],
    createdAt: '',
    updatedAt: '',
  },
];
const candidates = collectFunctionAutocompleteCandidates({
  parameters,
  functions,
  functionId: 'fn-current',
  labor,
});
assertCheck(
  'builds function autocomplete candidates',
  candidates.some((candidate) => candidate.name === 'height' && candidate.type === 'field') &&
    candidates.some((candidate) => candidate.name === 'round' && candidate.type === 'function') &&
    candidates.some((candidate) => candidate.name === 'other_fn' && candidate.functionSignature === 'x') &&
    !candidates.some((candidate) => candidate.name === 'current_fn') &&
    candidates.some((candidate) => candidate.name === 'installer.m2_per_hr')
);

const insertedToken = getFormulaWithInsertedToken({
  currentValue: 'width+',
  start: 6,
  end: 6,
  token: 'height',
});
assertCheck(
  'calculates function formula token insertion',
  insertedToken.value === 'width+height' &&
    insertedToken.cursorPosition === 12
);

const insertedOperator = getFormulaWithInsertedOperator({
  currentValue: 'widthheight',
  start: 5,
  end: 5,
  operator: '*',
});
assertCheck(
  'calculates function formula operator insertion',
  insertedOperator.value === 'width * height' &&
    insertedOperator.cursorPosition === 8
);

const validation = validateFunctionEditorForm({
  formData: {
    displayName: 'Area',
    name: 'area',
    description: '',
    formula: 'width * height',
    category: '',
  },
  parameters,
  formulaValidation: { valid: true },
  functions,
  functionId: 'new',
});
const saveData = buildFunctionSaveData({
  formData: {
    displayName: ' Area ',
    name: ' area ',
    description: ' ',
    formula: ' width * height ',
    category: ' Geometry ',
  },
  validParameters: validation.validParameters,
});
assertCheck(
  'validates and serializes function save data',
  Object.keys(validation.errors).length === 0 &&
    saveData.displayName === 'Area' &&
    saveData.name === 'area' &&
    saveData.formula === 'width * height' &&
    saveData.category === 'Geometry'
);
