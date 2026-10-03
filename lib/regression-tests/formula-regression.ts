import {
  evaluateFormula,
  parseFunctionCalls,
  validateFormula,
} from '../formula-evaluator';
import type { Labor, SharedFunction } from '../types';
import { prettifyFormula } from '../formula/prettify';
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

const missingValidation = validateFormula('width + missing', ['width'], []);
assertCheck(
  'validates missing variables',
  !missingValidation.valid && missingValidation.error === 'Undefined variable: missing',
  missingValidation.error
);

console.log('\n=== Evaluator Regression ===');
{
  const board = { id: 'b', name: 'Board', category: 'c', unit: 'ea', price: 100, variableName: 'board', properties: [{ id: 'w', name: 'width', type: 'number', value: 2 }], createdAt: '', updatedAt: '' } as unknown as import('../types').Material;
  const withFunctions = {
    fieldValues: { width: 4, height: 3, pick: 'board', flag: true },
    materials: [board],
    functions: [
      { id: 'a', displayName: 'add', name: 'add', formula: 'a + b', parameters: [{ name: 'a', label: 'a' }, { name: 'b', label: 'b' }], createdAt: '', updatedAt: '' },
      { id: 'd', displayName: 'double', name: 'double', formula: 'x * 2', parameters: [{ name: 'x', label: 'x' }], createdAt: '', updatedAt: '' },
      { id: 'w', displayName: 'wide', name: 'wide', formula: 'm.width * 10', parameters: [{ name: 'm', label: 'm', kind: 'material' }], createdAt: '', updatedAt: '' },
    ] as unknown as SharedFunction[],
  };
  const value = (formula: string) => evaluateFormula(formula, withFunctions);
  const failure = (formula: string) => {
    try {
      evaluateFormula(formula, withFunctions);
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
  assertCheck('names, properties and a bare material price all take their values', value('width * 2 + pick.width + board') === 110 && value('board.width + board.nothing') === 102);
  assertCheck('and, or and not work in a formula', value('(width > 2 and height > 2) * 10') === 10 && value('(width > 9 or flag) * 5') === 5 && value('(not flag) * 5') === 0);
  assertCheck('calls take arithmetic, nested calls and a picked material as arguments', value('add(width * 2, double(height))') === 14 && value('wide(pick) + 1') === 21 && value('double(add(1, 2)) * 2') === 12);
  assertCheck('a call that is wrong says which function and why', /Error evaluating function 'add': Function 'add' expects 2 argument\(s\), but got 1/.test(failure('add(1)')) && /Function 'nope' not found/.test(failure('nope(1)')));
  assertCheck('names without a value are listed before any function is worked out', failure('missing + other + add(1)') === 'Missing values for variables: missing, other');
  assertCheck('a name missing inside an argument is reported with the function it was passed to', failure('double(nothing * 2)') === "Error evaluating function 'double': Missing values for variables: nothing");
  assertCheck('a bad result is named', /infinity/.test(failure('1 / 0')) && /non-numeric/.test(failure('width > 2')));
  assertCheck('a formula that cannot be read says so with mathjs\'s own wording', /^Formula evaluation failed: .*(Unexpected|Value expected)/.test(failure('width *')));
}

console.log('\n=== Functions Taking Labor Regression ===');
{
  // A function called from a formula, or by another function, still sees the labor it was handed.
  const crew = {
    id: 'crew',
    name: 'Crew',
    category: 'Work',
    cost: 500,
    variableName: 'crew',
    properties: [{ id: 'rate', name: 'rate', type: 'number', value: 4 }],
    createdAt: '',
    updatedAt: '',
  } as unknown as Labor;
  const takingLabor = (name: string, formula: string, parameter: string) =>
    ({ id: name, displayName: name, name, formula, parameters: [{ name: parameter, label: parameter, kind: 'labor' }], createdAt: '', updatedAt: '' }) as unknown as SharedFunction;
  const context = {
    fieldValues: { crew: 'crew' },
    materials: [],
    labor: [crew],
    functions: [takingLabor('inner', 'x.rate * 2', 'x'), takingLabor('outer', 'inner(y) + 1', 'y')],
  };
  assertCheck('a function called from a formula can read its labor parameter', evaluateFormula('inner(crew)', context) === 8);
  assertCheck('so can one called by another function', evaluateFormula('outer(crew)', context) === 9);
  assertCheck('and one called with the labor inside an argument formula', evaluateFormula('inner(crew) * 2', context) === 16);
}

console.log('\n=== Formula Tidying Regression ===');
{
  const cases: Array<[string, string]> = [
    ['width*height', 'width * height'],
    ['  round( width*height ,2 )+1', 'round(width * height, 2) + 1'],
    ['2*(a+b)/ c', '2 * (a + b) / c'],
    ['-a+ -b*(-2)', '-a + -b * (-2)'],
    ['a>=b==1', 'a >= b == 1'],
    ['base_price*(include_tax==1)', 'base_price * (include_tax == 1)'],
    ['plate.lengde_på_plate*høyde', 'plate.lengde_på_plate * høyde'],
    ['1.5e3*x', '1.5e3 * x'],
    ['ceil(høyde/plate.lengde_på_plate)+areal_på_vegg(bredde,høyde)', 'ceil(høyde / plate.lengde_på_plate) + areal_på_vegg(bredde, høyde)'],
    ['a ? b : c', 'a ? b : c'],
    ['a and b', 'a and b'],
  ];
  const wrong = cases.filter(([input, expected]) => prettifyFormula(input) !== expected);
  assertCheck(
    'tidies spacing around operators, commas and brackets without changing what a formula means',
    wrong.length === 0,
    JSON.stringify(wrong.map(([input, expected]) => ({ input, expected, got: prettifyFormula(input) })))
  );
  assertCheck(
    "leaves a formula that doesn't parse as written",
    prettifyFormula('width *  ') === 'width *  ' && prettifyFormula('round(a,') === 'round(a,'
  );
}
