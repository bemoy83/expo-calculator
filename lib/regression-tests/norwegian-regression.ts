import { renameKeyReferences, keyProblem, suggestKey } from '../calculator/editing';
import { evaluateCalculator } from '../calculator/evaluate';
import type { Calculator, CalculatorLibrary } from '../calculator/types';
import { parseFunctionCalls, parsePropertyReferences } from '../formula/parser';
import { findStandalone, NAME_WITH_PROPERTY, replaceStandalone } from '../formula/identifiers';
import { validateFormula } from '../formula-evaluator';
import { findFunctionUsage } from '../functions/function-usage';
import { getFunctionParamKinds } from '../functions/param-kinds';
import type { Material, SharedFunction } from '../types';
import { labelToVariableName } from '../utils';
import { assertCheck, testFormula } from './test-helpers';

console.log('\n=== Norwegian Names Regression ===');

const gips: Material = {
  id: 'm-gips',
  name: 'Gipsplate',
  category: 'Plater',
  unit: 'pcs',
  price: 100,
  variableName: 'gipsplate_på_lager',
  properties: [{ id: 'p', name: 'lengde_på_plate', type: 'number', value: 2.4, storedValue: 2.4 }],
  createdAt: '',
  updatedAt: '',
};

const areal: SharedFunction = {
  id: 'fn-areal',
  displayName: 'Areal på vegg',
  name: 'areal_på_vegg',
  formula: 'bredde * høyde',
  parameters: [
    { name: 'bredde', label: 'Bredde' },
    { name: 'høyde', label: 'Høyde' },
  ],
  createdAt: '',
  updatedAt: '',
};
const plater: SharedFunction = {
  id: 'fn-plater',
  displayName: 'Plater',
  name: 'plater',
  formula: 'ceil(høyde / plate.lengde_på_plate)',
  parameters: [
    { name: 'høyde', label: 'Høyde' },
    { name: 'plate', label: 'Plate' },
  ],
  createdAt: '',
  updatedAt: '',
};

testFormula('høyde * bredde', 6, { fieldValues: { høyde: 2, bredde: 3 }, materials: [] });
testFormula('ærfugl + øvre - årstall', 3, { fieldValues: { ærfugl: 1, øvre: 4, årstall: 2 }, materials: [] });
testFormula('gipsplate_på_lager.lengde_på_plate * 2', 4.8, { fieldValues: {}, materials: [gips] });
testFormula('areal_på_vegg(bredde, høyde) + plater(høyde, valgt_plate) + valgt_plate.lengde_på_plate', 10.4, {
  fieldValues: { bredde: 2, høyde: 3, valgt_plate: 'gipsplate_på_lager' },
  materials: [gips],
  functions: [areal, plater],
});

assertCheck(
  'a formula with æøå names validates',
  validateFormula('areal_på_vegg(bredde, høyde) * gipsplate_på_lager.lengde_på_plate', ['bredde', 'høyde'], [gips], undefined, [areal]).valid
);
assertCheck(
  'an unknown æøå name is reported whole',
  /høyde_2/.test(validateFormula('høyde_2 * 2', ['høyde'], []).error ?? ''),
  validateFormula('høyde_2 * 2', ['høyde'], []).error
);

assertCheck(
  'names are found whole, never split at æ, ø or å, and not inside numbers',
  findStandalone('øvre+nedre*2e5 - på_1.lengde', NAME_WITH_PROPERTY).join() === 'øvre,nedre,på_1.lengde' &&
    replaceStandalone('høyde + høyde_2 + xhøyde + høyde', 'høyde', '1') === '1 + høyde_2 + xhøyde + 1'
);
assertCheck(
  'nested and æøå function calls are all found',
  parseFunctionCalls('områder(få(x), y)').map((call) => call.functionName).join() === 'områder,få' &&
    parseFunctionCalls('f(g(x))').map((call) => call.functionName).join() === 'f,g' &&
    parsePropertyReferences('plate.lengde_på_plate').map((ref) => ref.fullMatch).join() === 'plate.lengde_på_plate'
);
assertCheck(
  'function usage and parameter kinds see æøå names',
  findFunctionUsage('areal_på_vegg', [
    { ...plater, id: 'a', formula: '2 * areal_på_vegg(a, b)' },
    { ...plater, id: 'b', formula: '2 * større_areal_på_vegg(a, b)' },
    { ...plater, id: 'c', formula: '2 * åareal_på_vegg(a, b)' },
  ]).functions.map((func) => func.id).join() === 'a' &&
    getFunctionParamKinds({ formula: 'ceil(høyde / plate.lengde_på_plate)', parameters: [{ name: 'plate', label: '' }] }).plate === 'material'
);

assertCheck(
  'names made from labels keep æ, ø and å',
  labelToVariableName('Høyde på vegg') === 'høyde_på_vegg' &&
    labelToVariableName('Ærfugl') === 'ærfugl' &&
    labelToVariableName('Bredde (m²)') === 'bredde_m'
);

const calculator: Calculator = {
  id: 'c',
  name: 'Vegg',
  inputs: [
    { id: 'i-høyde', key: 'høyde', label: 'Høyde', widget: 'number', value: { kind: 'number', default: 2.5 } },
    { id: 'i-bredde', key: 'bredde', label: 'Bredde', widget: 'number', value: { kind: 'number', default: 4 } },
  ],
  parts: [{ id: 'p', name: 'Vegg' }],
  steps: [
    { id: 's-areal', partId: 'p', key: 'areal', label: 'Areal', source: { type: 'call', functionName: 'areal_på_vegg', args: { bredde: { type: 'input', key: 'bredde' }, høyde: { type: 'input', key: 'høyde' } } } },
    { id: 's-sum', partId: 'p', key: 'sum_på_vegg', label: 'Sum', source: { type: 'expression', expression: 'areal * 2 + høyde' } },
  ],
  layout: [],
  createdAt: '',
  updatedAt: '',
};
const library: CalculatorLibrary = { materials: [gips], labor: [], functions: [areal, plater] };
const renamed = renameKeyReferences(calculator, 'høyde', 'vegghøyde');
const renamedSum = renamed.steps[1].source;
assertCheck(
  'a calculator with æøå inputs and steps calculates, accepts the names, and renames them',
  evaluateCalculator(calculator, {}, library).steps['s-sum']?.value === 22.5 &&
    keyProblem(calculator, 'lengde_på_vegg') === undefined &&
    suggestKey(calculator, 'Høyde') === 'høyde_2' &&
    renamedSum.type === 'expression' &&
    renamedSum.expression === 'areal * 2 + vegghøyde',
  JSON.stringify(evaluateCalculator(calculator, {}, library).steps)
);
