import assert from 'node:assert/strict';
import { evaluateFormula, parseFunctionCalls, validateFormula, analyzeFormulaVariables, type EvaluationContext } from './formula-evaluator';
import { calculateModuleInstance } from './calculations/module-calculator';
import { calculateQuoteTotals } from './calculations/money';
import { buildQuoteLineItem } from './quotes/line-item-builder';
import { getRestorableTemplateLinks } from './quotes/template-helpers';
import { recalculateWorkspaceModuleInstances } from './quotes/workspace-recalculation';
import {
  createTemplateModuleInstance,
  getDefaultTemplateFieldValues,
  initializeTemplateWorkspaceModules,
  serializeTemplateWorkspace,
} from './templates/template-instance-helpers';
import {
  addTemplateWorkspaceModule,
  linkTemplateWorkspaceField,
  recalculateTemplateWorkspace,
  removeTemplateWorkspaceModule,
  reorderTemplateWorkspaceModules,
  unlinkTemplateWorkspaceField,
  updateTemplateWorkspaceFieldValue,
  validateTemplateWorkspaceFieldLink,
} from './templates/template-workspace-actions';
import { CalculationModule, Labor, Material, ModuleTemplate, QuoteLineItem, QuoteModuleInstance, SharedFunction } from './types';
import { canLinkFields, resolveFieldLinksWithMetadata } from './utils/field-linking';

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

console.log('\n=== Quote Utility Regression ===');
const quoteModules: CalculationModule[] = [
  {
    id: 'source-module',
    name: 'Source',
    fields: [
      { id: 'source-width', label: 'Width', type: 'number', variableName: 'width', unitCategory: 'length', unitSymbol: 'm' },
    ],
    formula: 'width * 2',
    computedOutputs: [
      {
        id: 'source-area',
        label: 'Area',
        variableName: 'area',
        expression: 'width * 3',
        unitCategory: 'length',
        unitSymbol: 'm',
        showInQuote: true,
      },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'target-module',
    name: 'Target',
    fields: [
      { id: 'target-width', label: 'Linked Width', type: 'number', variableName: 'linked_width', unitCategory: 'length', unitSymbol: 'm' },
      { id: 'target-weight', label: 'Weight', type: 'number', variableName: 'weight', unitCategory: 'weight', unitSymbol: 'kg' },
    ],
    formula: 'linked_width + 1',
    createdAt: '',
    updatedAt: '',
  },
];

const quoteInstances: QuoteModuleInstance[] = [
  {
    id: 'source-instance',
    moduleId: 'source-module',
    fieldValues: { width: 2, 'out.area': 6 },
    calculatedCost: 4,
  },
  {
    id: 'target-instance',
    moduleId: 'target-module',
    fieldValues: { linked_width: 0, weight: 1 },
    fieldLinks: {
      linked_width: {
        moduleInstanceId: 'source-instance',
        fieldVariableName: 'out.area',
      },
    },
    calculatedCost: 0,
  },
];

const computedLinkValidation = canLinkFields(
  quoteInstances,
  quoteModules,
  'target-instance',
  'linked_width',
  'source-instance',
  'out.area'
);
assertCheck('validates computed-output field links', computedLinkValidation.valid, computedLinkValidation.error);

const unitMismatchLinkValidation = canLinkFields(
  quoteInstances,
  quoteModules,
  'target-instance',
  'weight',
  'source-instance',
  'out.area'
);
assertCheck(
  'rejects unit-mismatched computed-output links',
  !unitMismatchLinkValidation.valid && !!unitMismatchLinkValidation.error?.includes('length'),
  unitMismatchLinkValidation.error
);

const resolvedQuoteLinks = resolveFieldLinksWithMetadata(quoteInstances);
assertCheck(
  'resolves computed-output links',
  resolvedQuoteLinks.resolvedValues['target-instance'].linked_width === 6 &&
    resolvedQuoteLinks.brokenLinks.length === 0
);

const brokenResolution = resolveFieldLinksWithMetadata([
  {
    ...quoteInstances[1],
    fieldLinks: {
      linked_width: {
        moduleInstanceId: 'missing-instance',
        fieldVariableName: 'width',
      },
    },
  },
]);
assertCheck(
  'reports broken links without throwing',
  brokenResolution.resolvedValues['target-instance'].linked_width === 0 &&
    brokenResolution.brokenLinks.length === 1
);

const recalculatedWorkspace = recalculateWorkspaceModuleInstances({
  workspaceModules: quoteInstances,
  modules: quoteModules,
  materials: [],
  labor: [],
  functions: [],
});
assertCheck(
  'recalculates workspace modules with linked computed outputs',
  recalculatedWorkspace.workspaceModules.find((instance) => instance.id === 'target-instance')?.calculatedCost === 7
);

const lineItemResult = buildQuoteLineItem({
  instance: quoteInstances[0],
  moduleDef: quoteModules[0],
  resolvedFieldValues: { width: 2 },
  materials: [],
  labor: [],
  functions: [],
});
assertCheck(
  'builds quote line item summaries',
  !!lineItemResult.lineItem &&
    lineItemResult.lineItem.primarySummary === 'Area: 6 m' &&
    lineItemResult.lineItem.secondarySummary === 'Width: 2 m'
);

const templateForLinks: ModuleTemplate = {
  id: 'template',
  name: 'Template',
  moduleInstances: [
    {
      id: 'old-source',
      moduleId: 'source-module',
    },
    {
      id: 'old-target',
      moduleId: 'target-module',
      fieldLinks: {
        linked_width: {
          moduleInstanceId: 'old-source',
          fieldVariableName: 'width',
        },
      },
    },
  ],
  categories: [],
  createdAt: '',
  updatedAt: '',
};
const restorableTemplateLinks = getRestorableTemplateLinks({
  template: templateForLinks,
  workspaceModules: [
    { ...quoteInstances[0], id: 'new-source' },
    { ...quoteInstances[1], id: 'new-target', fieldLinks: undefined },
  ],
  instanceMap: new Map([
    [0, 'new-source'],
    [1, 'new-target'],
  ]),
  getModule: (id) => quoteModules.find((module) => module.id === id),
  canLink: (sourceInstanceId, fieldName, targetInstanceId, targetFieldName) =>
    canLinkFields(
      [
        { ...quoteInstances[0], id: 'new-source' },
        { ...quoteInstances[1], id: 'new-target', fieldLinks: undefined },
      ],
      quoteModules,
      sourceInstanceId,
      fieldName,
      targetInstanceId,
      targetFieldName
    ),
});
assertCheck(
  'maps ID-based template links to new instances',
  restorableTemplateLinks.links.length === 1 &&
    restorableTemplateLinks.links[0].sourceInstanceId === 'new-target' &&
    restorableTemplateLinks.links[0].targetInstanceId === 'new-source'
);

console.log('\n=== Template Editor Helper Regression ===');
const templateMaterials: Material[] = [
  {
    id: 'paint-a',
    name: 'Paint A',
    category: 'paint',
    unit: 'liter',
    price: 10,
    variableName: 'paint_a',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'wood-a',
    name: 'Wood A',
    category: 'wood',
    unit: 'piece',
    price: 20,
    variableName: 'wood_a',
    createdAt: '',
    updatedAt: '',
  },
];
const templateLabor: Labor[] = [
  {
    id: 'installer-a',
    name: 'Installer A',
    category: 'install',
    cost: 100,
    variableName: 'installer_a',
    createdAt: '',
    updatedAt: '',
  },
];
const templateDefaults = getDefaultTemplateFieldValues(
  [
    { id: 'n', label: 'Number', type: 'number', variableName: 'number_value' },
    { id: 'b', label: 'Boolean', type: 'boolean', variableName: 'enabled' },
    { id: 'd', label: 'Dropdown', type: 'dropdown', variableName: 'choice' },
    { id: 't', label: 'Text', type: 'text', variableName: 'note' },
    { id: 'm', label: 'Material', type: 'material', variableName: 'material', materialCategory: 'wood' },
    { id: 'l', label: 'Labor', type: 'labor', variableName: 'labor', laborCategory: 'install' },
  ],
  templateMaterials,
  templateLabor
);
assert.deepEqual(templateDefaults, {
  number_value: '',
  enabled: false,
  choice: '',
  note: '',
  material: 'wood_a',
  labor: 'installer_a',
});
assertCheck('creates template defaults for all field types', true);

const templateInstance = createTemplateModuleInstance({
  moduleDef: quoteModules[0],
  materials: templateMaterials,
  labor: templateLabor,
});
assertCheck(
  'creates new template module instances with defaults',
  templateInstance.moduleId === 'source-module' &&
    templateInstance.fieldValues.width === '' &&
    templateInstance.calculatedCost === 0
);

const legacyTemplate: ModuleTemplate = {
  id: 'legacy-template',
  name: 'Legacy Template',
  moduleInstances: [
    {
      moduleId: 'source-module',
      fieldValues: { width: 4 },
    },
    {
      id: 'saved-target',
      moduleId: 'target-module',
      fieldValues: { linked_width: 0, weight: 2 },
      fieldLinks: {
        linked_width: {
          moduleInstanceId: '__index_0__',
          fieldVariableName: 'out.area',
        },
      },
    },
  ],
  categories: [],
  createdAt: '',
  updatedAt: '',
};
const initializedTemplateModules = initializeTemplateWorkspaceModules({
  template: legacyTemplate,
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
const initializedSource = initializedTemplateModules[0];
const initializedTarget = initializedTemplateModules[1];
assertCheck(
  'initializes templates with saved values and costs',
  initializedSource.fieldValues.width === 4 &&
    initializedSource.fieldValues['out.area'] === 12 &&
    initializedSource.calculatedCost === 8
);
assertCheck(
  'migrates legacy index links to instance IDs',
  initializedTarget.id === 'saved-target' &&
    initializedTarget.fieldLinks?.linked_width.moduleInstanceId === initializedSource.id &&
    initializedTarget.fieldLinks.linked_width.fieldVariableName === 'out.area'
);
assertCheck(
  'recalculates computed-output links in initialized templates',
  initializedTarget.fieldValues.linked_width === 0 &&
    initializedTarget.calculatedCost === 13
);

const brokenTemplateModules = initializeTemplateWorkspaceModules({
  template: {
    ...legacyTemplate,
    moduleInstances: [
      legacyTemplate.moduleInstances[1],
    ],
  },
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'initializes templates with broken links without crashing',
  brokenTemplateModules.length === 1 &&
    !brokenTemplateModules[0].fieldLinks?.linked_width &&
    brokenTemplateModules[0].calculatedCost === 1
);

const serializedTemplateWorkspace = serializeTemplateWorkspace({
  workspaceModules: [
    { ...initializedSource, fieldLinks: {} },
    initializedTarget,
  ],
  modules: [
    { ...quoteModules[0], category: 'source-category' },
    { ...quoteModules[1], category: 'target-category' },
  ],
  name: '  Saved Template  ',
  description: '  Template description  ',
});
assertCheck(
  'serializes template workspaces with categories and non-empty links',
  serializedTemplateWorkspace.name === 'Saved Template' &&
    serializedTemplateWorkspace.description === 'Template description' &&
    serializedTemplateWorkspace.categories.join(',') === 'source-category,target-category' &&
    serializedTemplateWorkspace.moduleInstances[0].fieldLinks === undefined &&
    serializedTemplateWorkspace.moduleInstances[1].fieldLinks?.linked_width.fieldVariableName === 'out.area'
);

const templateWorkspaceContext = {
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [] as SharedFunction[],
};
const updatedTemplateWorkspace = updateTemplateWorkspaceFieldValue(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedSource.id,
  'width',
  5
);
assertCheck(
  'updates template workspace fields and recalculates',
  updatedTemplateWorkspace[0].fieldValues.width === 5 &&
    updatedTemplateWorkspace[0].fieldValues['out.area'] === 15 &&
    updatedTemplateWorkspace[0].calculatedCost === 10 &&
    updatedTemplateWorkspace[1].calculatedCost === 16
);

const addedTemplateWorkspace = addTemplateWorkspaceModule(
  initializedTemplateModules,
  templateWorkspaceContext,
  'source-module'
);
assertCheck(
  'adds template workspace modules with defaults and recalculates',
  addedTemplateWorkspace.length === initializedTemplateModules.length + 1 &&
    addedTemplateWorkspace[2].moduleId === 'source-module' &&
    addedTemplateWorkspace[2].fieldValues.width === '' &&
    addedTemplateWorkspace[2].calculatedCost === 0
);

const removedTemplateWorkspace = removeTemplateWorkspaceModule(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedSource.id
);
assertCheck(
  'removes template workspace modules and cleans broken links',
  removedTemplateWorkspace.length === 1 &&
    removedTemplateWorkspace[0].id === initializedTarget.id &&
    !removedTemplateWorkspace[0].fieldLinks?.linked_width &&
    removedTemplateWorkspace[0].calculatedCost === 1
);

const reorderedTemplateWorkspace = reorderTemplateWorkspaceModules(
  initializedTemplateModules,
  0,
  1
);
assertCheck(
  'reorders template workspace modules without recalculating',
  reorderedTemplateWorkspace[0].id === initializedTarget.id &&
    reorderedTemplateWorkspace[1].id === initializedSource.id &&
    reorderedTemplateWorkspace[0].calculatedCost === initializedTarget.calculatedCost &&
    reorderedTemplateWorkspace[1].calculatedCost === initializedSource.calculatedCost
);

const unlinkedTemplateWorkspace = unlinkTemplateWorkspaceField(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'linked_width'
);
assertCheck(
  'unlinks template workspace fields and recalculates',
  !unlinkedTemplateWorkspace[1].fieldLinks?.linked_width &&
    unlinkedTemplateWorkspace[1].calculatedCost === 1
);

const relinkedTemplateWorkspace = linkTemplateWorkspaceField(
  unlinkedTemplateWorkspace,
  templateWorkspaceContext,
  initializedTarget.id,
  'linked_width',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'links template workspace fields and recalculates',
  relinkedTemplateWorkspace.valid &&
    relinkedTemplateWorkspace.workspaceModules[1].fieldLinks?.linked_width.fieldVariableName === 'out.area' &&
    relinkedTemplateWorkspace.workspaceModules[1].calculatedCost === 13
);

const invalidTemplateWorkspaceLink = linkTemplateWorkspaceField(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'weight',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'rejects invalid template workspace links without changing modules',
  !invalidTemplateWorkspaceLink.valid &&
    !!invalidTemplateWorkspaceLink.error?.includes('length') &&
    invalidTemplateWorkspaceLink.workspaceModules === initializedTemplateModules
);

const directInvalidTemplateValidation = validateTemplateWorkspaceFieldLink(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'weight',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'validates invalid template workspace links',
  !directInvalidTemplateValidation.valid &&
    !!directInvalidTemplateValidation.error?.includes('length')
);

const recalculatedTemplateWorkspace = recalculateTemplateWorkspace(
  [
    {
      ...initializedSource,
      fieldValues: { width: 6 },
    },
    {
      ...initializedTarget,
      fieldValues: { linked_width: 0, weight: 2 },
    },
  ],
  templateWorkspaceContext
);
assertCheck(
  'recalculates template workspaces directly',
  recalculatedTemplateWorkspace[0].fieldValues['out.area'] === 18 &&
    recalculatedTemplateWorkspace[1].calculatedCost === 19
);

console.log('\n=== Tests Complete ===');
