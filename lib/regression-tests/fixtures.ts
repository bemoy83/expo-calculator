import type {
  Labor,
  Material,
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
