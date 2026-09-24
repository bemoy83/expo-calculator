import {
  countByCategory,
  countModulesUsingCatalogItem,
  formatCatalogPropertyValue,
} from '../catalog/catalog-display';
import type { CalculationModule, LaborProperty, MaterialProperty } from '../types';
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

const usageModules = [
  { id: 'a', formula: 'width * mdf18', computedOutputs: [], fields: [] },
  { id: 'b', formula: 'area / 2', computedOutputs: [{ expression: 'mdf18.thickness * 2' }], fields: [] },
  { id: 'c', formula: 'mdf180 + ply12', computedOutputs: [], fields: [] },
  { id: 'd', formula: 'sheet.mdf18', computedOutputs: [], fields: [] },
  { id: 'e', formula: 'sheets * area', fields: [{ type: 'material', variableName: 'sheets', materialCategory: 'Sheets' }] },
  { id: 'f', formula: 'any * 2', fields: [{ type: 'material', variableName: 'any', materialCategory: '' }] },
  { id: 'g', formula: 'crew * hours', fields: [{ type: 'labor', variableName: 'crew', laborCategory: 'Rigging' }] },
] as unknown as CalculationModule[];
const mdf = { variableName: 'mdf18', category: 'Sheets' };
assertCheck(
  'counts modules using an item by name (bare or property) or through a category-matching picker',
  // a, b by name; e (Sheets picker) and f (any-category picker). Not c (prefix) or d (as a property).
  countModulesUsingCatalogItem(usageModules, mdf, 'material') === 4 &&
    countModulesUsingCatalogItem(usageModules, { variableName: 'ply12', category: 'Boards' }, 'material') === 2 &&
    countModulesUsingCatalogItem(usageModules, { variableName: 'rigger', category: 'Rigging' }, 'labor') === 1 &&
    countModulesUsingCatalogItem(usageModules, { variableName: 'painter', category: 'Paint' }, 'labor') === 0,
  String(countModulesUsingCatalogItem(usageModules, mdf, 'material'))
);

const counts = countByCategory([{ category: 'Boards' }, { category: 'Paint' }, { category: 'Boards' }]);
assertCheck('counts items per category', counts.get('Boards') === 2 && counts.get('Paint') === 1);
