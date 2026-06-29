import {
  analyzeFormulaVariables,
  parseFunctionCalls,
  validateFormula,
} from '../formula-evaluator';
import { calculateModuleInstance } from '../calculations/module-calculator';
import type { CalculationModule } from '../types';
import { sharedFunctions } from './fixtures';
import { assertCheck, assertThrowsFormula, testFormula } from './test-helpers';

console.log('=== Formula Runtime Regression ===');

testFormula('round(3.2)', 3);
testFormula('round(3.5)', 4);
testFormula('round(3.7)', 4);
testFormula('round(-3.2)', -3);
testFormula('round(-3.5)', -3);
testFormula('round(3.14159, 2)', 3.14);
testFormula('round(3.14159, 0)', 3);
testFormula('round(3.14159, 4)', 3.1416);
testFormula('round(123.456, 1)', 123.5);
testFormula('round(123.456, -1)', 120);
testFormula('ceil(3.1)', 4);
testFormula('ceil(3.0)', 3);
testFormula('ceil(3.9)', 4);
testFormula('ceil(-3.1)', -3);
testFormula('ceil(-3.9)', -3);
testFormula('floor(3.1)', 3);
testFormula('floor(3.9)', 3);
testFormula('floor(3.0)', 3);
testFormula('floor(-3.1)', -4);
testFormula('floor(-3.9)', -4);

console.log('\n=== Complex Formula Regression ===');
testFormula('round(3.14159 * 2, 2)', 6.28);
testFormula('ceil(10.5 / 3)', 4);
testFormula('floor(10.5 / 3)', 3);
testFormula('round(10.5 / 3, 2)', 3.5);

console.log('\n=== Formula Error Regression ===');
assertThrowsFormula('round() without arguments', 'round()', 'round() requires at least 1 argument');
assertThrowsFormula('round() with 3 arguments', 'round(3.14, 2, 3)', 'round() accepts at most 2 arguments');
assertThrowsFormula('ceil() without arguments', 'ceil()', 'ceil() expects exactly 1 argument');
assertThrowsFormula('floor() with 2 arguments', 'floor(3, 4)', 'floor() expects exactly 1 argument');

console.log('\n=== Material Property Formula Regression ===');
testFormula('mat_board.width + width', 7, {
  fieldValues: { width: 2 },
  materials: [
    {
      id: 'mat1',
      name: 'Board',
      category: 'wood',
      unit: 'ea',
      price: 5,
      variableName: 'mat_board',
      sku: '',
      supplier: '',
      description: '',
      properties: [{ id: 'prop1', name: 'width', type: 'number', value: 5 }],
      createdAt: '',
      updatedAt: '',
    },
  ],
});

testFormula('material.width + material', 7, {
  fieldValues: { material: 'mat_board' },
  materials: [
    {
      id: 'mat1',
      name: 'Board',
      category: 'wood',
      unit: 'ea',
      price: 5,
      variableName: 'mat_board',
      sku: '',
      supplier: '',
      description: '',
      properties: [{ id: 'prop1', name: 'width', type: 'number', value: 2 }],
      createdAt: '',
      updatedAt: '',
    },
  ],
});

testFormula('mat_panel.flag + mat_panel.depth', 6, {
  fieldValues: {},
  materials: [
    {
      id: 'mat2',
      name: 'Panel',
      category: 'wood',
      unit: 'ea',
      price: 10,
      variableName: 'mat_panel',
      sku: '',
      supplier: '',
      description: '',
      properties: [
        { id: 'propFlag', name: 'flag', type: 'boolean', value: true },
        { id: 'propDepth', name: 'depth', type: 'string', value: '5' },
      ],
      createdAt: '',
      updatedAt: '',
    },
  ],
});

testFormula('mat_generic.missing', 9, {
  fieldValues: {},
  materials: [
    {
      id: 'mat3',
      name: 'Generic',
      category: 'misc',
      unit: 'ea',
      price: 9,
      variableName: 'mat_generic',
      sku: '',
      supplier: '',
      description: '',
      properties: [],
      createdAt: '',
      updatedAt: '',
    },
  ],
});

testFormula('mat_beam.price_per_length * 4.8', 30, {
  fieldValues: {},
  materials: [
    {
      id: 'mat4',
      name: 'Beam',
      category: 'wood',
      unit: 'ea',
      price: 30,
      variableName: 'mat_beam',
      sku: '',
      supplier: '',
      description: '',
      properties: [
        {
          id: 'propLen',
          name: 'length',
          type: 'number',
          value: 4.8,
          unitSymbol: 'm',
          unitCategory: 'length',
        },
        {
          id: 'propPricePerLen',
          name: 'price_per_length',
          type: 'price',
          value: 6.25,
          unitSymbol: 'm',
          unitCategory: 'length',
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
  ],
});

console.log('\n=== Shared Function Regression ===');
testFormula('double(add(width, height))', 10, {
  fieldValues: { width: 2, height: 3 },
  materials: [],
  functions: sharedFunctions,
});

console.log('\n=== Computed Output Failure Regression ===');
const moduleWithBadOutput: CalculationModule = {
  id: 'bad-module',
  name: 'Bad Module',
  fields: [],
  formula: 'out.area * 2',
  computedOutputs: [
    {
      id: 'out-area',
      label: 'Area',
      variableName: 'area',
      expression: 'missing_width * 2',
    },
  ],
  createdAt: '',
  updatedAt: '',
};
const calculation = calculateModuleInstance({
  moduleDef: moduleWithBadOutput,
  fieldValues: {},
  materials: [],
  functions: [],
});
assertCheck(
  'computed output failure is reported without zero fallback',
  calculation.errors.length > 0 && calculation.computedValues['out.area'] === undefined
);

console.log('\n=== Parser and Validation Regression ===');
const siblingCalls = parseFunctionCalls('add(width, height) + double(depth)');
assertCheck(
  'parses sibling function calls',
  siblingCalls.length === 2 &&
    siblingCalls[0].functionName === 'add' &&
    siblingCalls[1].functionName === 'double'
);

const nestedCalls = parseFunctionCalls('double(add(width, height))');
assertCheck(
  'parses nested function calls',
  nestedCalls.length === 2 &&
    nestedCalls.some((call) => call.fullMatch === 'double(add(width, height))') &&
    nestedCalls.some((call) => call.fullMatch === 'add(width, height)')
);

const debugInfo = analyzeFormulaVariables(
  'wallboard.width + out.area + mat_board.length',
  ['wallboard', 'out.area'],
  [
    {
      id: 'mat-board',
      name: 'Board',
      category: 'wood',
      unit: 'ea',
      price: 10,
      variableName: 'mat_board',
      properties: [{ id: 'mat-length', name: 'length', type: 'number', value: 2 }],
      createdAt: '',
      updatedAt: '',
    },
  ],
  [{ variableName: 'wallboard', type: 'material' }]
);
assertCheck(
  'analyzes field/material/computed references',
  debugInfo.fieldPropertyRefs.some((ref) => ref.full === 'wallboard.width') &&
    debugInfo.materialPropertyRefs.some((ref) => ref.full === 'mat_board.length') &&
    debugInfo.computedOutputs.includes('out.area')
);

const missingValidation = validateFormula('width + missing', ['width'], [], []);
assertCheck(
  'validates missing variables',
  !missingValidation.valid && missingValidation.error === 'Undefined variable: missing',
  missingValidation.error
);

const materialFieldValidation = validateFormula(
  'material.width',
  ['material'],
  [
    {
      id: 'mat-field',
      name: 'Board',
      category: 'wood',
      unit: 'ea',
      price: 5,
      variableName: 'mat_board',
      properties: [{ id: 'width', name: 'width', type: 'number', value: 2 }],
      createdAt: '',
      updatedAt: '',
    },
  ],
  [{ variableName: 'material', type: 'material' }]
);
assertCheck('validates material field properties', materialFieldValidation.valid, materialFieldValidation.error);

const laborFieldValidation = validateFormula(
  'installer.m2_per_hr',
  ['installer'],
  [],
  [{ variableName: 'installer', type: 'labor' }],
  [],
  [
    {
      id: 'labor-field',
      name: 'Installer',
      category: 'install',
      cost: 500,
      variableName: 'installer_rate',
      properties: [{ id: 'm2-rate', name: 'm2_per_hr', type: 'number', value: 10 }],
      createdAt: '',
      updatedAt: '',
    },
  ]
);
assertCheck('validates labor field properties', laborFieldValidation.valid, laborFieldValidation.error);

const computedOutputValidation = validateFormula('out.area * 2', ['out.area'], [], []);
assertCheck('validates computed output references', computedOutputValidation.valid, computedOutputValidation.error);

const unitMismatchValidation = validateFormula(
  'width + weight',
  ['width', 'weight'],
  [],
  [
    { variableName: 'width', type: 'number', unitCategory: 'length', unitSymbol: 'm' },
    { variableName: 'weight', type: 'number', unitCategory: 'weight', unitSymbol: 'kg' },
  ]
);
assertCheck(
  'validates unit mismatch',
  !unitMismatchValidation.valid && !!unitMismatchValidation.error?.includes('Cannot add length'),
  unitMismatchValidation.error
);
