import {
  countByCategory,
  countCalculatorsUsingCatalogItem,
  formatCatalogPropertyValue,
} from '../catalog/catalog-display';
import type { Calculator } from '../calculator/types';
import type { LaborProperty, MaterialProperty } from '../types';
import { assertCheck } from './test-helpers';

console.log('\n=== Catalog Display Regression ===');

const thickness: MaterialProperty = {
  id: 'p-1',
  name: 'thickness',
  type: 'number',
  value: 18,
  unitSymbol: 'mm',
  unitCategory: 'length',
  storedValue: 0.018,
};
const legacyDensity: MaterialProperty = { id: 'p-2', name: 'density', type: 'number', value: 750, unit: 'kg/m³' };
const fireRated: MaterialProperty = { id: 'p-3', name: 'fire_rated', type: 'boolean', value: 'true' };
const laborRate: LaborProperty = {
  id: 'p-4',
  name: 'm2_per_hr',
  type: 'number',
  value: 4.5,
  unitSymbol: 'm2',
  unitCategory: 'area',
  storedValue: 4.5,
};

assertCheck(
  'formats property values in their display unit, without float noise',
  formatCatalogPropertyValue(thickness) === '18 mm' &&
    formatCatalogPropertyValue(legacyDensity) === '750 kg/m³' &&
    formatCatalogPropertyValue(fireRated) === 'True' &&
    formatCatalogPropertyValue(laborRate) === '4.5 m2',
  [thickness, legacyDensity, fireRated, laborRate].map(formatCatalogPropertyValue).join(' | ')
);

const calc = (id: string, formulas: string[], pickers: Array<{ kind: 'material' | 'labor'; category?: string }> = []) =>
  ({
    id,
    steps: formulas.map((expression) => ({ source: { type: 'expression', expression } })),
    inputs: pickers.map((picker) => ({ value: { kind: picker.kind, category: picker.category } })),
  }) as unknown as Calculator;
const usageCalculators = [
  calc('a', ['width * mdf18']),
  calc('b', ['area / 2', 'mdf18.thickness * 2']),
  calc('c', ['mdf180 + ply12']),
  calc('d', ['sheet.mdf18']),
  calc('e', ['sheets.price * area'], [{ kind: 'material', category: 'Sheets' }]),
  calc('f', ['any.price * 2'], [{ kind: 'material', category: '' }]),
  calc('g', ['crew.cost * hours'], [{ kind: 'labor', category: 'Rigging' }]),
];
const mdf = { variableName: 'mdf18', category: 'Sheets' };
assertCheck(
  'counts calculators using an item by name (bare or property) or through a category-matching picker',
  // a, b by name; e (Sheets picker) and f (any-category picker). Not c (prefix) or d (as a property).
  countCalculatorsUsingCatalogItem(usageCalculators, mdf, 'material') === 4 &&
    countCalculatorsUsingCatalogItem(usageCalculators, { variableName: 'ply12', category: 'Boards' }, 'material') === 2 &&
    countCalculatorsUsingCatalogItem(usageCalculators, { variableName: 'rigger', category: 'Rigging' }, 'labor') === 1 &&
    countCalculatorsUsingCatalogItem(usageCalculators, { variableName: 'painter', category: 'Paint' }, 'labor') === 0,
  String(countCalculatorsUsingCatalogItem(usageCalculators, mdf, 'material'))
);

const counts = countByCategory([{ category: 'Boards' }, { category: 'Paint' }, { category: 'Boards' }]);
assertCheck('counts items per category', counts.get('Boards') === 2 && counts.get('Paint') === 1);
