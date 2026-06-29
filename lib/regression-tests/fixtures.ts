import type {
  CalculationModule,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from '../types';

export const sharedFunctions: SharedFunction[] = [
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

export const quoteModules: CalculationModule[] = [
  {
    id: 'source-module',
    name: 'Source',
    fields: [
      {
        id: 'source-width',
        label: 'Width',
        type: 'number',
        variableName: 'width',
        unitCategory: 'length',
        unitSymbol: 'm',
      },
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
      {
        id: 'target-width',
        label: 'Linked Width',
        type: 'number',
        variableName: 'linked_width',
        unitCategory: 'length',
        unitSymbol: 'm',
      },
      {
        id: 'target-weight',
        label: 'Weight',
        type: 'number',
        variableName: 'weight',
        unitCategory: 'weight',
        unitSymbol: 'kg',
      },
    ],
    formula: 'linked_width + 1',
    createdAt: '',
    updatedAt: '',
  },
];

export const quoteInstances: QuoteModuleInstance[] = [
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

export const templateMaterials: Material[] = [
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

export const templateLabor: Labor[] = [
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
