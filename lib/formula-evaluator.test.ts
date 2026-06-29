import assert from 'node:assert/strict';
import { evaluateFormula, parseFunctionCalls, validateFormula, analyzeFormulaVariables, type EvaluationContext } from './formula-evaluator';
import { calculateModuleInstance } from './calculations/module-calculator';
import { calculateQuoteTotals } from './calculations/money';
import { CalculationModule, QuoteLineItem, SharedFunction } from './types';

function testFormula(
  formula: string,
  expected: number,
  context: EvaluationContext = { fieldValues: {}, materials: [] }
) {
  const result = evaluateFormula(formula, context);
  assert.ok(
    Math.abs(result - expected) < 0.0001,
    `${formula} expected ${expected}, got ${result}`
  );
  console.log(`✓ ${formula} = ${result} (expected: ${expected})`);
}

function assertCheck(label: string, passed: boolean, detail?: string) {
  assert.ok(passed, detail ? `${label}: ${detail}` : label);
  console.log(`✓ ${label}${detail ? ` - ${detail}` : ''}`);
}

function assertThrowsFormula(label: string, formula: string, expectedMessage: string) {
  assert.throws(
    () => evaluateFormula(formula, { fieldValues: {}, materials: [] }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes(expectedMessage),
    `${label} should throw "${expectedMessage}"`
  );
  console.log(`✓ ${label} correctly throws`);
}

console.log('=== Rounding Function Tests ===');

// round() with 1 argument
testFormula('round(3.2)', 3);
testFormula('round(3.5)', 4);
testFormula('round(3.7)', 4);
testFormula('round(-3.2)', -3);
testFormula('round(-3.5)', -3);

// round() with 2 arguments
testFormula('round(3.14159, 2)', 3.14);
testFormula('round(3.14159, 0)', 3);
testFormula('round(3.14159, 4)', 3.1416);
testFormula('round(123.456, 1)', 123.5);
testFormula('round(123.456, -1)', 120);

// ceil() tests
testFormula('ceil(3.1)', 4);
testFormula('ceil(3.0)', 3);
testFormula('ceil(3.9)', 4);
testFormula('ceil(-3.1)', -3);
testFormula('ceil(-3.9)', -3);

// floor() tests
testFormula('floor(3.1)', 3);
testFormula('floor(3.9)', 3);
testFormula('floor(3.0)', 3);
testFormula('floor(-3.1)', -4);
testFormula('floor(-3.9)', -4);

// Complex formula tests with rounding
console.log('\n=== Complex Formula Tests ===');
testFormula('round(3.14159 * 2, 2)', 6.28);
testFormula('ceil(10.5 / 3)', 4);
testFormula('floor(10.5 / 3)', 3);
testFormula('round(10.5 / 3, 2)', 3.5);

// Error handling tests
console.log('\n=== Error Handling Tests ===');
assertThrowsFormula('round() without arguments', 'round()', 'round() requires at least 1 argument');
assertThrowsFormula('round() with 3 arguments', 'round(3.14, 2, 3)', 'round() accepts at most 2 arguments');
assertThrowsFormula('ceil() without arguments', 'ceil()', 'ceil() expects exactly 1 argument');
assertThrowsFormula('floor() with 2 arguments', 'floor(3, 4)', 'floor() expects exactly 1 argument');

console.log('\n=== Overlapping Names Regression ===');
testFormula(
  'mat_board.width + width',
  7,
  {
    fieldValues: {
      width: 2, // standalone field variable with same name as material property
    },
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
        properties: [
          {
            id: 'prop1',
            name: 'width',
            type: 'number',
            value: 5,
          },
        ],
        createdAt: '',
        updatedAt: '',
      },
    ],
  }
);

console.log('\n=== Material Selector With Property Overlap ===');
testFormula(
  'material.width + material',
  7,
  {
    fieldValues: {
      material: 'mat_board', // material field selects the material
    },
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
        properties: [
          {
            id: 'prop1',
            name: 'width',
            type: 'number',
            value: 2,
          },
        ],
        createdAt: '',
        updatedAt: '',
      },
    ],
  }
);

console.log('\n=== Boolean and String Property Conversion ===');
testFormula(
  'mat_panel.flag + mat_panel.depth',
  6, // flag -> 1, depth -> 5 after string-to-number
  {
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
          {
            id: 'propFlag',
            name: 'flag',
            type: 'boolean',
            value: true,
          },
          {
            id: 'propDepth',
            name: 'depth',
            type: 'string',
            value: '5',
          },
        ],
        createdAt: '',
        updatedAt: '',
      },
    ],
  }
);

console.log('\n=== Missing Property Falls Back To Price ===');
testFormula(
  'mat_generic.missing',
  9, // falls back to material price when property not found
  {
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
  }
);

console.log('\n=== Unit-Aware Price Per Length ===');
testFormula(
  'mat_beam.price_per_length * 4.8',
  30, // price_per_length should be 30/4.8 = 6.25
  {
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
  }
);

console.log('\n=== Nested Function Regression ===');
const sharedFunctions: SharedFunction[] = [
  {
    id: 'fn-add',
    displayName: 'Add',
    name: 'add',
    formula: 'a + b',
    parameters: [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fn-double',
    displayName: 'Double',
    name: 'double',
    formula: 'x * 2',
    parameters: [{ name: 'x', label: 'X' }],
    createdAt: '',
    updatedAt: '',
  },
];

testFormula('double(add(width, height))', 10, {
  fieldValues: { width: 2, height: 3 },
  materials: [],
  functions: sharedFunctions,
});

console.log('\n=== Quote Totals Regression ===');
const lineItems: QuoteLineItem[] = [
  {
    id: 'li-1',
    moduleId: 'm-1',
    moduleName: 'Module 1',
    fieldValues: {},
    fieldSummary: '',
    cost: 10.005,
    createdAt: '',
  },
  {
    id: 'li-2',
    moduleId: 'm-2',
    moduleName: 'Module 2',
    fieldValues: {},
    fieldSummary: '',
    cost: 20.005,
    createdAt: '',
  },
];
const totals = calculateQuoteTotals({ lineItems, markupPercent: 10, taxRate: 0.25 });
assert.deepEqual(totals, {
  subtotal: 30.01,
  markupAmount: 3,
  taxAmount: 8.25,
  total: 41.26,
});
console.log(`✓ totals = ${JSON.stringify(totals)}`);

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
      properties: [
        {
          id: 'mat-length',
          name: 'length',
          type: 'number',
          value: 2,
        },
      ],
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

console.log('\n=== Tests Complete ===');
