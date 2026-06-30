import {
  addParameterFromModuleField,
  buildFunctionSaveData,
  collectFunctionAutocompleteCandidates,
  getAvailableModuleFieldNames,
  getFormulaWithInsertedOperator,
  getFormulaWithInsertedToken,
  validateFunctionEditorForm,
} from '../functions/function-editor-helpers';
import type { CalculationModule, Labor, SharedFunction } from '../types';
import { assertCheck } from './test-helpers';

console.log('\n=== Function Editor Helper Regression ===');

const functionModules: CalculationModule[] = [
  {
    id: 'module-a',
    name: 'Module A',
    fields: [
      { id: 'width', label: 'Width', type: 'number', variableName: 'width' },
      { id: 'height', label: 'Height', type: 'number', variableName: 'height' },
    ],
    formula: 'width * height',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'module-b',
    name: 'Module B',
    fields: [
      { id: 'width-duplicate', label: 'Width', type: 'number', variableName: 'Width' },
      { id: 'depth', label: 'Depth', type: 'number', variableName: 'depth' },
    ],
    formula: 'depth',
    createdAt: '',
    updatedAt: '',
  },
];
assertCheck(
  'collects unique module field names for function parameters',
  getAvailableModuleFieldNames(functionModules).join(',') === 'depth,height,width'
);

const parameters = addParameterFromModuleField(
  [{ name: 'width', label: 'width', required: true }],
  'height'
);
assertCheck(
  'adds module fields as function parameters without duplicates',
  parameters.length === 2 &&
    addParameterFromModuleField(parameters, 'HEIGHT') === parameters
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
