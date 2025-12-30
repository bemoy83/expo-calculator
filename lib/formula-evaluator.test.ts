/**
 * Formula Evaluator Tests
 * 
 * These are example test cases for the formula evaluator.
 * In a production environment, these would be run with a testing framework like Jest.
 */

import { evaluateFormula, type EvaluationContext } from './formula-evaluator';

// Test helper function
function testFormula(
  formula: string,
  expected: number,
  context: EvaluationContext = { fieldValues: {}, materials: [] }
) {
  try {
    const result = evaluateFormula(formula, context);
    const passed = Math.abs(result - expected) < 0.0001; // Allow for floating point precision
    console.log(`${passed ? '✓' : '✗'} ${formula} = ${result} (expected: ${expected})`);
    return passed;
  } catch (error: any) {
    console.log(`✗ ${formula} - Error: ${error.message}`);
    return false;
  }
}

// Rounding function tests
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
try {
  evaluateFormula('round()', { fieldValues: {}, materials: [] });
  console.log('✗ round() without arguments should throw error');
} catch (error: any) {
  console.log(`✓ round() without arguments correctly throws: ${error.message}`);
}

try {
  evaluateFormula('round(3.14, 2, 3)', { fieldValues: {}, materials: [] });
  console.log('✗ round() with 3 arguments should throw error');
} catch (error: any) {
  console.log(`✓ round() with 3 arguments correctly throws: ${error.message}`);
}

try {
  evaluateFormula('ceil()', { fieldValues: {}, materials: [] });
  console.log('✗ ceil() without arguments should throw error');
} catch (error: any) {
  console.log(`✓ ceil() without arguments correctly throws: ${error.message}`);
}

try {
  evaluateFormula('floor(3, 4)', { fieldValues: {}, materials: [] });
  console.log('✗ floor() with 2 arguments should throw error');
} catch (error: any) {
  console.log(`✓ floor() with 2 arguments correctly throws: ${error.message}`);
}

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

console.log('\n=== Tests Complete ===');
