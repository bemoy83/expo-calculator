import { callFunction } from '../calculator/call-function';
import { orderSteps, rewriteExpression, scanExpression } from '../calculator/dependencies';
import {
  addInput,
  addPart,
  addSection,
  addStep,
  conditionInputs,
  defaultCondition,
  findLayoutItem,
  insertLayoutItem,
  moveLayoutItem,
  moveSection,
  removeInput,
  removeLayoutItem,
  removeSection,
  setInputCondition,
  unplacedInputs,
  updateSection,
  widgetsFor,
  copyCalculator,
  createEmptyCalculator,
  isStepShown,
  keyProblem,
  moveStepToPart,
  removePart,
  removeStep,
  setPartCost,
  setStepShown,
  suggestKey,
  updateInput,
  updateStep,
} from '../calculator/editing';
import { evaluateCalculator } from '../calculator/evaluate';
import { describeCondition } from '../calculator/format';
import { missingProperties, requiredProperties } from '../calculator/requirements';
import { fixPricePropertyStorage, normalizePropertyValue, priceFromBase, priceToBase, propertyValueInUnit } from '../catalog/prices';
import { getMaterialValue } from '../formula/resolver';
import { buildCalculatorLineItem, putLineItem } from '../quotes/calculator-line-item';
import { roundMoney } from '../calculations/money';
import { calculatorFromModule } from '../calculator/from-module';
import { calculatorFromTemplate, calculatorsFromTemplates } from '../calculator/from-template';
import { callToExpression, expressionToCall } from '../calculator/step-source';
import { getFunctionParamKinds } from '../functions/param-kinds';
import { describeFunctionUsage, findFunctionUsage } from '../functions/function-usage';
import type { Calculator, CalculatorInput, CalculatorLibrary, CalculatorStep, CalculatorValues } from '../calculator/types';
import { calculateModuleInstance } from '../calculations/module-calculator';
import type { CalculationModule, Material, MaterialProperty, ModuleTemplate, Quote, SharedFunction } from '../types';
import { normalizeToBase } from '../units';
import { assertCheck } from './test-helpers';

console.log('\n=== Calculator Regression ===');

const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-6;

let ids = 0;
const createId = () => `id-${++ids}`;

function fn(name: string, parameters: string[], formula: string): SharedFunction {
  return {
    id: `fn-${name}`,
    displayName: name,
    name,
    formula,
    parameters: parameters.map((param) => ({ name: param, label: param })),
    createdAt: '',
    updatedAt: '',
  };
}

function prop(name: string, type: 'number' | 'price', value: number, unitSymbol?: string): MaterialProperty {
  return {
    id: `p-${name}`,
    name,
    type,
    value,
    unitSymbol,
    storedValue: unitSymbol ? normalizeToBase(value, unitSymbol) : value,
  };
}

function material(variableName: string, category: string, price: number, properties: MaterialProperty[]): Material {
  return { id: `m-${variableName}`, name: variableName, category, unit: 'pcs', price, variableName, properties, createdAt: '', updatedAt: '' };
}

// The partition-wall functions and the "Partition wall" module, the reference version.
const functions: SharedFunction[] = [
  fn('area_rectangle', ['width', 'height'], 'width * height'),
  fn('perimeter_rectangle', ['width', 'height'], '2 * (width + height)'),
  fn('stud_count', ['width', 'stud_spacing'], 'floor(width / stud_spacing)'),
  fn('spill', ['spill'], '(1 + spill / 100)'),
  fn('sheets_width', ['width', 'material'], 'ceil(width/material.width)'),
  fn('sheets_height', ['height', 'material'], 'ceil(round((height - material.height) / material.height , 1)) + 1'),
];

const materials: Material[] = [
  material('lumber_48x98', 'Lumber', 37.9, [prop('width', 'number', 48, 'mm'), prop('price', 'price', 37.9, 'm')]),
  material('mdf_6mm', 'Sheets', 312.56, [
    prop('width', 'number', 1200, 'mm'),
    prop('height', 'number', 2440, 'mm'),
    prop('price_per_sheet', 'price', 312.56),
    prop('price_per_m2', 'price', 10, 'm2'),
  ]),
  material('paint_2_7', 'Paint', 299, [
    prop('coverage', 'number', 10, 'm2'),
    prop('volume', 'number', 2.7),
    prop('price_per_bucket', 'price', 299),
  ]),
];

const library: CalculatorLibrary = { materials, labor: [], functions };

const partitionWall: CalculationModule = {
  id: 'partition-wall',
  name: 'Partition wall',
  fields: [
    { id: 'f1', label: 'Width', type: 'number', variableName: 'width', unitSymbol: 'm', unitCategory: 'length' },
    { id: 'f2', label: 'Height', type: 'number', variableName: 'height', unitSymbol: 'm', unitCategory: 'length' },
    { id: 'f3', label: 'Stud spacing', type: 'dropdown', variableName: 'stud_spacing', options: ['40', '60'], dropdownMode: 'numeric', unitSymbol: 'cm', unitCategory: 'length', defaultValue: 0.6 },
    { id: 'f4', label: 'Lumber', type: 'material', variableName: 'lumber', materialCategory: 'Lumber' },
    { id: 'f5', label: 'Spill', type: 'dropdown', variableName: 'spill', options: ['0', '10', '15'], unitSymbol: '%' },
    { id: 'f6', label: 'Sheets', type: 'material', variableName: 'sheets', materialCategory: 'Sheets' },
    { id: 'f7', label: 'Sheeting on both sides', type: 'boolean', variableName: 'sheeting_on_both_sides' },
    { id: 'f8', label: 'Paint', type: 'material', variableName: 'paint', materialCategory: 'Paint' },
    { id: 'f9', label: 'Paint layers', type: 'number', variableName: 'paint_layers', defaultValue: 2 },
    { id: 'f10', label: 'Painted on both sides', type: 'boolean', variableName: 'painted_on_both_sides' },
    { id: 'f11', label: 'Quantity', type: 'number', variableName: 'quantity', unitSymbol: 'pcs', defaultValue: 1 },
  ],
  formula:
    '(((out.framing*spill(spill))*lumber.price) + (out.sheet_count * sheets.price_per_sheet) + ((ceil(out.paint_volume/paint.volume))*paint.price_per_bucket))*quantity',
  computedOutputs: [
    { id: 'o1', label: 'Paint area', variableName: 'paint_area', expression: 'area_rectangle(width, height)', unitSymbol: 'm2' },
    { id: 'o2', label: 'Framing', variableName: 'framing', expression: 'perimeter_rectangle(width, height)+ height * stud_count(width, stud_spacing)', unitSymbol: 'm' },
    { id: 'o3', label: 'Sheet count', variableName: 'sheet_count', expression: 'sheets_height(height, sheets) * sheets_width(width, sheets) * ((sheeting_on_both_sides ==1) + 1)', unitSymbol: 'pcs' },
    { id: 'o4', label: 'Paint volume', variableName: 'paint_volume', expression: 'area_rectangle(width, height) * paint_layers * ((painted_on_both_sides ==1) + 1) / paint.coverage', unitSymbol: 'l' },
  ],
  createdAt: '',
  updatedAt: '',
};

const moduleValues = {
  width: 4,
  height: 2.5,
  stud_spacing: 0.6,
  lumber: 'lumber_48x98',
  spill: '10',
  sheets: 'mdf_6mm',
  sheeting_on_both_sides: false,
  paint: 'paint_2_7',
  paint_layers: 2,
  painted_on_both_sides: false,
  quantity: 1,
};

const { calculator: wall, warnings: wallWarnings } = calculatorFromModule(partitionWall, { createId, now: 'now' });
const inputByKey = (calculator: Calculator, key: string) => calculator.inputs.find((input) => input.key === key)!;
const stepByKey = (calculator: Calculator, key: string) => calculator.steps.find((step) => step.key === key)!;
const optionId = (input: CalculatorInput, label: string) =>
  input.value.kind === 'choice' ? input.value.options.find((option) => option.label === label)!.id : '';

// ---- Conversion ----

const studSpacing = inputByKey(wall, 'stud_spacing');
const spillInput = inputByKey(wall, 'spill');
assertCheck(
  'converts fields to inputs of the right kind, keeping choice values in base units',
  wall.inputs.length === 11 &&
    inputByKey(wall, 'width').value.kind === 'number' &&
    inputByKey(wall, 'lumber').value.kind === 'material' &&
    inputByKey(wall, 'sheeting_on_both_sides').value.kind === 'boolean' &&
    studSpacing.value.kind === 'choice' &&
    close(studSpacing.value.options.find((option) => option.label === '60')?.value, 0.6) &&
    studSpacing.value.default === optionId(studSpacing, '60') &&
    spillInput.value.kind === 'choice' &&
    close(spillInput.value.options.find((option) => option.label === '10')?.value, 10) &&
    wallWarnings.length === 0,
  JSON.stringify({ studSpacing: studSpacing.value, wallWarnings })
);

const wallCost = wall.steps.find((step) => step.id === wall.parts[0].costStepId)!;
assertCheck(
  'converts outputs to steps in one part, with the cost formula as its cost step and out.x renamed',
  wall.parts.length === 1 &&
    wall.parts[0].name === 'Partition wall' &&
    wall.steps.map((step) => step.key).join(',') === 'paint_area,framing,sheet_count,paint_volume,cost' &&
    wall.steps.every((step) => step.partId === wall.parts[0].id) &&
    wallCost.format === 'money' &&
    wallCost.source.type === 'expression' &&
    !wallCost.source.expression.includes('out.') &&
    wallCost.source.expression.includes('(framing*spill(spill))'),
  wallCost.source.type === 'expression' ? wallCost.source.expression : ''
);

// ---- Evaluation ----

const wallValues: CalculatorValues = {
  width: 4,
  height: 2.5,
  stud_spacing: optionId(studSpacing, '60'),
  lumber: 'lumber_48x98',
  spill: optionId(spillInput, '10'),
  sheets: 'mdf_6mm',
  sheeting_on_both_sides: false,
  paint: 'paint_2_7',
  paint_layers: 2,
  painted_on_both_sides: false,
  quantity: 1,
};
const wallResult = evaluateCalculator(wall, wallValues, library);
const moduleResult = calculateModuleInstance({
  moduleDef: partitionWall,
  fieldValues: moduleValues,
  materials,
  functions,
  roundCost: false,
});
const stepValue = (key: string) => wallResult.steps[stepByKey(wall, key).id];
assertCheck(
  'gives the same cost and outputs as the module it came from (2716.56)',
  close(wallResult.total, moduleResult.cost) &&
    close(wallResult.total, 1167.32 + 1250.24 + 299) &&
    close(wallResult.quoteCost, moduleResult.cost) &&
    close(stepValue('framing').value, moduleResult.computedValues['out.framing']) &&
    close(stepValue('sheet_count').value, 4) &&
    close(stepValue('paint_volume').value, 2) &&
    // Shown as 2 l, as the module showed it, not converted from m³.
    close(stepValue('paint_volume').displayValue, 2) &&
    stepByKey(wall, 'paint_volume').unitIsLabel === true &&
    stepByKey(wall, 'framing').unitIsLabel === undefined &&
    wallResult.parts[wall.parts[0].id].status === 'ok',
  JSON.stringify({ total: wallResult.total, module: moduleResult.cost, errors: moduleResult.errors })
);

// Missing values are reported, not thrown or logged.
const originalError = console.error;
let logged = 0;
console.error = () => {
  logged += 1;
};
const partial = evaluateCalculator(wall, { width: 4 }, library);
console.error = originalError;
const wallPart = partial.parts[wall.parts[0].id];
assertCheck(
  'reports the inputs a step is missing instead of evaluating it, without console errors',
  logged === 0 &&
    partial.steps[stepByKey(wall, 'paint_area').id].status === 'missing' &&
    (partial.steps[stepByKey(wall, 'paint_area').id].missingInputs ?? []).join(',') === 'height' &&
    partial.steps[stepByKey(wall, 'sheet_count').id].missingInputs?.join(',') === 'height,sheets' &&
    // The cost reads the outputs, so it also names what they are missing.
    (partial.steps[wallCost.id].missingInputs ?? []).join(',') === 'height,lumber,spill,sheets,paint' &&
    wallPart.status === 'missing' &&
    wallPart.missingInputs.join(',') === 'height,lumber,spill,sheets,paint' &&
    partial.total === undefined,
  JSON.stringify({ logged, missing: wallPart.missingInputs })
);
assertCheck(
  'applies defaults: choice default, number default, toggles off',
  partial.resolvedValues.stud_spacing === 0.6 &&
    partial.resolvedValues.paint_layers === 2 &&
    partial.resolvedValues.quantity === 1 &&
    partial.resolvedValues.sheeting_on_both_sides === false &&
    !('height' in partial.resolvedValues),
  JSON.stringify(partial.resolvedValues)
);
assertCheck(
  'treats a picked material that is no longer in the catalog as missing',
  !('paint' in evaluateCalculator(wall, { ...wallValues, paint: 'deleted_paint' }, library).resolvedValues)
);

// ---- Parts, order, errors ----

function expressionStep(partId: string, key: string, expression: string, extra: Partial<CalculatorStep> = {}): CalculatorStep {
  return { id: `step-${key}`, partId, key, label: key, source: { type: 'expression', expression }, ...extra };
}
function numberInput(key: string, defaultValue?: number): CalculatorInput {
  return { id: `input-${key}`, key, label: key, widget: 'number', value: { kind: 'number', default: defaultValue } };
}
function build(inputs: CalculatorInput[], parts: Calculator['parts'], steps: CalculatorStep[], extra: Partial<Calculator> = {}): Calculator {
  return { id: 'c', name: 'Test', inputs, parts, steps, layout: [], createdAt: '', updatedAt: '', ...extra };
}

const split = build(
  [
    numberInput('width', 4),
    numberInput('height', 2.5),
    numberInput('layers'),
    { id: 'input-paint', key: 'paint', label: 'Paint', widget: 'picker', value: { kind: 'material', category: 'Paint' } },
    { id: 'input-include', key: 'include_paint', label: 'Include paint', widget: 'toggle', value: { kind: 'boolean', default: true } },
  ],
  [
    { id: 'framing', name: 'Framing', costStepId: 'step-framing_cost' },
    { id: 'paint', name: 'Paint', costStepId: 'step-paint_cost' },
  ],
  [
    // Listed out of order on purpose: paint_cost reads steps listed after it.
    expressionStep('paint', 'paint_cost', 'ceil(paint_litres / paint.volume) * paint.price_per_bucket', {
      format: 'money',
      enabledWhen: { inputKey: 'include_paint', op: 'is', value: true },
    }),
    expressionStep('paint', 'paint_litres', 'wall_area * layers / paint.coverage'),
    expressionStep('framing', 'framing_cost', 'wall_area * 10', { format: 'money' }),
    expressionStep('framing', 'wall_area', 'area_rectangle(width, height)', { unitSymbol: 'm2' }),
  ]
);
const splitResult = evaluateCalculator(split, { paint: 'paint_2_7' }, library);
assertCheck(
  'keeps problems in their part: Framing costs while Paint waits for layers',
  splitResult.parts.framing.status === 'ok' &&
    close(splitResult.parts.framing.cost, 100) &&
    splitResult.parts.paint.status === 'missing' &&
    splitResult.parts.paint.missingInputs.join(',') === 'layers' &&
    splitResult.steps['step-paint_cost'].status === 'blocked' &&
    splitResult.steps['step-paint_cost'].blockedBy?.join(',') === 'paint_litres' &&
    splitResult.total === undefined,
  JSON.stringify(splitResult.parts)
);
assertCheck(
  "lists a part's inputs and the steps it reads from other parts",
  splitResult.parts.paint.inputKeys.join(',') === 'layers,paint,include_paint' &&
    splitResult.parts.paint.externalStepKeys.join(',') === 'wall_area' &&
    splitResult.parts.framing.inputKeys.join(',') === 'width,height',
  JSON.stringify({ paint: splitResult.parts.paint.inputKeys, framing: splitResult.parts.framing.inputKeys })
);

const splitFull = evaluateCalculator(split, { paint: 'paint_2_7', layers: 2 }, library);
assertCheck(
  'evaluates steps in dependency order, whatever their list order, and sums part costs',
  close(splitFull.steps['step-paint_litres'].value, 2) &&
    close(splitFull.parts.paint.cost, 299) &&
    close(splitFull.total, 399) &&
    close(splitFull.steps['step-wall_area'].displayValue, 10),
  JSON.stringify({ total: splitFull.total })
);

const splitOff = evaluateCalculator(split, { paint: 'paint_2_7', layers: 2, include_paint: false }, library);
assertCheck(
  'a step whose condition is off counts as 0',
  splitOff.steps['step-paint_cost'].status === 'disabled' && close(splitOff.parts.paint.cost, 0) && close(splitOff.total, 100)
);

const broken = build(
  [numberInput('width', 2)],
  [{ id: 'p', name: 'P', costStepId: 'step-total' }],
  [
    expressionStep('p', 'good', 'width * 2'),
    expressionStep('p', 'typo', 'widht * 2'),
    expressionStep('p', 'uses_typo', 'typo + good'),
    expressionStep('p', 'loop_a', 'loop_b + 1'),
    expressionStep('p', 'loop_b', 'loop_a + 1'),
    expressionStep('p', 'after_loop', 'loop_a * 2'),
    expressionStep('p', 'width', '1'),
    expressionStep('p', 'total', 'good'),
  ]
);
const brokenResult = evaluateCalculator(broken, {}, library);
const statusOf = (key: string) => brokenResult.steps[`step-${key}`];
assertCheck(
  'reports unknown names, circular references and clashing names on their own steps',
  statusOf('good').status === 'ok' &&
    statusOf('typo').status === 'error' &&
    (statusOf('typo').message ?? '').includes('widht') &&
    statusOf('uses_typo').status === 'blocked' &&
    statusOf('loop_a').status === 'error' &&
    (statusOf('loop_a').message ?? '').includes('loop_a → loop_b → loop_a') &&
    statusOf('after_loop').status === 'blocked' &&
    statusOf('width').status === 'error' &&
    close(brokenResult.total, 4),
  JSON.stringify(brokenResult.steps)
);

// ---- Function-call steps ----

const called = build(
  [
    numberInput('width', 3.6),
    { id: 'input-sheets', key: 'sheets', label: 'Sheets', widget: 'picker', value: { kind: 'material', default: 'mdf_6mm' } },
  ],
  [{ id: 'p', name: 'Sheeting', costStepId: 'step-cost' }],
  [
    {
      id: 'step-columns',
      partId: 'p',
      key: 'columns',
      label: 'Columns',
      source: { type: 'call', functionName: 'sheets_width', args: { width: { type: 'input', key: 'width' }, material: { type: 'input', key: 'sheets' } } },
    },
    {
      id: 'step-cost',
      partId: 'p',
      key: 'cost',
      label: 'Cost',
      source: {
        type: 'call',
        functionName: 'area_rectangle',
        args: { width: { type: 'step', key: 'columns' }, height: { type: 'property', inputKey: 'sheets', property: 'price_per_sheet' } },
      },
      format: 'money',
    },
    {
      id: 'step-spilled',
      partId: 'p',
      key: 'spilled',
      label: 'With spill',
      source: { type: 'call', functionName: 'spill', args: { spill: { type: 'constant', value: 15, unitSymbol: '%' } } },
    },
    {
      id: 'step-unbound',
      partId: 'p',
      key: 'unbound',
      label: 'Unbound',
      source: { type: 'call', functionName: 'area_rectangle', args: { width: { type: 'input', key: 'width' } } },
    },
  ]
);
const calledResult = evaluateCalculator(called, {}, library);
assertCheck(
  'function-call steps bind inputs, steps, material properties and constants',
  close(calledResult.steps['step-columns'].value, 3) &&
    close(calledResult.total, 3 * 312.56) &&
    close(calledResult.steps['step-spilled'].value, 1.15) &&
    calledResult.steps['step-unbound'].status === 'error' &&
    (calledResult.steps['step-unbound'].message ?? '').includes('height'),
  JSON.stringify(calledResult.steps)
);

assertCheck(
  'callFunction evaluates with named values and names any it is missing',
  close(callFunction(functions[0], { width: 2, height: 3 }, library), 6) &&
    (() => {
      try {
        callFunction(functions[0], { width: 2 }, library);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes('height');
      }
    })()
);

// ---- Conversion edge cases ----

const clash: CalculationModule = {
  id: 'clash',
  name: 'Clash',
  fields: [
    { id: 'a', label: 'Area', type: 'number', variableName: 'area', defaultValue: 5 },
    { id: 'b', label: 'Finish', type: 'dropdown', variableName: 'finish', options: ['Matte', 'Gloss'], defaultValue: 'Gloss' },
    { id: 'c', label: 'Blank', type: 'number', variableName: '' },
  ],
  formula: 'out.area + area',
  computedOutputs: [
    { id: 'o1', label: 'Area out', variableName: 'area', expression: 'area * 2' },
    { id: 'o2', label: 'Double', variableName: 'double_area', expression: 'area + 1' },
  ],
  createdAt: '',
  updatedAt: '',
};
const { calculator: clashCalc, warnings: clashWarnings } = calculatorFromModule(clash, { createId });
const clashExpr = (key: string) => {
  const source = stepByKey(clashCalc, key).source;
  return source.type === 'expression' ? source.expression : '';
};
const clashResult = evaluateCalculator(clashCalc, {}, library);
const clashModule = calculateModuleInstance({ moduleDef: clash, fieldValues: { area: 5 }, materials, functions, roundCost: false });
assertCheck(
  'renames an output that clashes with a field, keeping what each formula read',
  clashExpr('area_2') === 'area * 2' &&
    clashExpr('double_area') === 'area_2 + 1' &&
    clashExpr('cost') === 'area_2 + area' &&
    close(clashResult.total, clashModule.cost) &&
    close(clashResult.steps[stepByKey(clashCalc, 'double_area').id].value, clashModule.computedValues['out.double_area']),
  JSON.stringify({ exprs: clashCalc.steps.map((step) => step.source), total: clashResult.total, module: clashModule })
);
const finish = inputByKey(clashCalc, 'finish');
assertCheck(
  'numbers text dropdown options, keeps their default, and warns about both',
  finish.value.kind === 'choice' &&
    finish.value.options.map((option) => option.value).join(',') === '1,2' &&
    finish.value.default === optionId(finish, 'Gloss') &&
    clashWarnings.some((warning) => warning.includes('Finish')) &&
    clashWarnings.some((warning) => warning.includes('area_2')) &&
    clashWarnings.some((warning) => warning.includes('Blank')) &&
    clashCalc.inputs.length === 2,
  JSON.stringify(clashWarnings)
);

// ---- Expression helpers ----

assertCheck(
  'scans names, telling calls from values and skipping exponents',
  scanExpression('spill(spill) * 1e5 + sheets.width')
    .map((token) => `${token.text}${token.isCall ? '()' : ''}`)
    .join(' ') === 'spill() spill sheets.width'
);
assertCheck(
  'rewrites only the names asked for',
  rewriteExpression('out.a + a + b(a)', (token) => (token.text === 'out.a' ? 'a_2' : null)) === 'a_2 + a + b(a)'
);
const ordered = orderSteps(['c', 'b', 'a'], new Map([['c', ['b']], ['b', ['a']], ['a', []]]));
assertCheck('orders steps after the steps they read', ordered.order.join(',') === 'a,b,c' && ordered.cycles.size === 0);

// ---- Editing (builder) ----

{
  let n = 0;
  const makeId = () => `e-${++n}`;
  let calc = createEmptyCalculator(makeId, 'now');
  const partId = calc.parts[0].id;
  const widthInput: CalculatorInput = { id: makeId(), key: 'width', label: 'Width', widget: 'number', value: { kind: 'number', default: 2 } };
  const sheetsInput: CalculatorInput = { id: makeId(), key: 'sheets', label: 'Sheets', widget: 'picker', value: { kind: 'material', default: 'mdf_6mm' } };
  calc = addInput(calc, widthInput, makeId);
  calc = addInput(calc, sheetsInput, makeId);
  calc = addStep(calc, { id: 'a', partId, key: 'area', label: 'Area', source: { type: 'expression', expression: 'width * sheets.width' } });
  calc = addStep(calc, {
    id: 'b',
    partId,
    key: 'cols',
    label: 'Cols',
    source: { type: 'call', functionName: 'sheets_width', args: { width: { type: 'step', key: 'area' }, material: { type: 'input', key: 'sheets' } } },
    enabledWhen: { inputKey: 'width', op: '>', value: 0 },
  });
  calc = setPartCost(calc, partId, 'a');
  calc = setStepShown(calc, 'b', true, makeId);

  assertCheck(
    'new inputs are placed in the inputs section; shown steps go before the breakdown',
    calc.layout[0].items.map((item) => (item.type === 'input' ? item.inputId : '')).join(',') === `${widthInput.id},${sheetsInput.id}` &&
      calc.layout[1].items.map((item) => item.type).join(',') === 'result,breakdown' &&
      isStepShown(calc, 'b') &&
      calc.steps[0].format === 'money',
    JSON.stringify(calc.layout)
  );

  const inputsRenamed = updateInput(updateInput(calc, { ...widthInput, key: 'wall_width' }), { ...sheetsInput, key: 'board' });
  const renamed = updateStep(inputsRenamed, { ...inputsRenamed.steps[0], key: 'wall_area' });
  const renamedB = renamed.steps.find((step) => step.id === 'b')!;
  assertCheck(
    'renaming a key rewrites formulas, properties, bindings and conditions',
    renamed.steps[0].source.type === 'expression' &&
      renamed.steps[0].source.expression === 'wall_width * board.width' &&
      renamedB.source.type === 'call' &&
      renamedB.source.args.width.type === 'step' &&
      (renamedB.source.args.width as { key: string }).key === 'wall_area' &&
      (renamedB.source.args.material as { key: string }).key === 'board' &&
      renamedB.enabledWhen?.inputKey === 'wall_width' &&
      close(evaluateCalculator(renamed, {}, library).total, evaluateCalculator(calc, {}, library).total!),
    JSON.stringify(renamed.steps)
  );

  assertCheck(
    'suggests free names and explains unusable ones',
    suggestKey(calc, 'Width') === 'width_2' &&
      suggestKey(calc, 'Wall area (m²)') === 'wall_area_m' &&
      keyProblem(calc, 'width') !== undefined &&
      keyProblem(calc, 'width', widthInput.id) === undefined &&
      keyProblem(calc, '2x') !== undefined
  );

  const withoutA = removeStep(calc, 'a');
  assertCheck(
    "removing a step clears it as the part's cost and from the layout",
    withoutA.parts[0].costStepId === undefined && withoutA.steps.length === 1 && !isStepShown(removeStep(calc, 'b'), 'b')
  );

  const extraPart = { id: 'p2', name: 'Paint' };
  const twoParts = addPart(calc, extraPart);
  const breakdown = twoParts.layout[1].items.find((item) => item.type === 'breakdown');
  const moved = moveStepToPart(twoParts, 'a', 'p2');
  assertCheck(
    'a new part joins the breakdown; moving a step drops it as the old part cost; removing a part removes its steps',
    breakdown?.type === 'breakdown' &&
      breakdown.partIds.join(',') === `${partId},p2` &&
      moved.parts[0].costStepId === undefined &&
      moved.steps.find((step) => step.id === 'a')?.partId === 'p2' &&
      removePart(moved, 'p2').steps.map((step) => step.id).join(',') === 'b'
  );

  const copied = copyCalculator(wall, makeId, 'now');
  const copiedResult = evaluateCalculator(copied, { ...wallValues, stud_spacing: undefined, spill: undefined }, library);
  const originalResult = evaluateCalculator(wall, { ...wallValues, stud_spacing: undefined, spill: undefined }, library);
  assertCheck(
    'a copy gets new ids everywhere and calculates the same',
    copied.id !== wall.id &&
      copied.sourceModuleId === wall.sourceModuleId &&
      copied.steps.every((step) => !wall.steps.some((original) => original.id === step.id)) &&
      copied.parts[0].costStepId === copied.steps[copied.steps.length - 1].id &&
      copied.layout[0].items.every((item) => item.type !== 'input' || copied.inputs.some((input) => input.id === item.inputId)) &&
      originalResult.parts[wall.parts[0].id].missingInputs.join(',') === copiedResult.parts[copied.parts[0].id].missingInputs.join(','),
    JSON.stringify(copiedResult.parts)
  );
}

// ---- Layout editing (layout view) ----

{
  let n = 0;
  const makeId = () => `l-${++n}`;
  let calc = createEmptyCalculator(makeId, 'now');
  const [inputsSection, resultsSection] = calc.layout;
  const a: CalculatorInput = { id: 'in-a', key: 'a', label: 'A', widget: 'number', value: { kind: 'number' } };
  const b: CalculatorInput = { id: 'in-b', key: 'b', label: 'B', widget: 'number', value: { kind: 'number' } };
  calc = addInput(addInput(calc, a, makeId), b, makeId);
  calc = addSection(calc, { id: 'extra', title: 'Extra', items: [] }, inputsSection.id);

  assertCheck(
    'adds a section after another, and an input into a chosen section',
    calc.layout.map((section) => section.id).join(',') === `${inputsSection.id},extra,${resultsSection.id}` &&
      addInput(calc, { ...a, id: 'in-c', key: 'c' }, makeId, 'extra').layout[1].items.length === 1
  );

  const moved = moveLayoutItem(calc, { sectionId: inputsSection.id, index: 0 }, { sectionId: 'extra', index: 0 });
  const reordered = moveLayoutItem(calc, { sectionId: inputsSection.id, index: 1 }, { sectionId: inputsSection.id, index: 0 });
  assertCheck(
    'moves items between sections and within one',
    moved.layout[0].items.length === 1 &&
      moved.layout[1].items[0].type === 'input' &&
      (moved.layout[1].items[0] as { inputId: string }).inputId === 'in-a' &&
      reordered.layout[0].items.map((item) => (item as { inputId: string }).inputId).join(',') === 'in-b,in-a' &&
      findLayoutItem(moved, 'input:in-a')?.sectionId === 'extra'
  );

  const removedItem = removeLayoutItem(calc, { sectionId: inputsSection.id, index: 0 });
  const removedSection = removeSection(moved, 'extra');
  assertCheck(
    'removing an input from the page, or its section, leaves it unplaced but in the calculator',
    unplacedInputs(removedItem).map((input) => input.id).join(',') === 'in-a' &&
      removedItem.inputs.length === 2 &&
      unplacedInputs(removedSection).map((input) => input.id).join(',') === 'in-a' &&
      unplacedInputs(insertLayoutItem(removedSection, resultsSection.id, { type: 'input', inputId: 'in-a' }, 0)).length === 0
  );

  const twice = insertLayoutItem(calc, 'extra', { type: 'input', inputId: 'in-a' });
  assertCheck(
    'placing an input that is already on the page moves it rather than showing it twice',
    twice.layout.flatMap((section) => section.items).filter((item) => item.type === 'input' && item.inputId === 'in-a').length === 1 &&
      findLayoutItem(twice, 'input:in-a')?.sectionId === 'extra'
  );

  assertCheck(
    'offers widgets that suit the input kind',
    widgetsFor('number').includes('slider') && widgetsFor('choice').join(',') === 'dropdown,segmented,radio' && widgetsFor('boolean')[0] === 'toggle'
  );
  assertCheck(
    'moves sections and updates their title',
    moveSection(calc, 'extra', -1).layout[0].id === 'extra' &&
      updateSection(calc, 'extra', { title: 'Wall' }).layout[1].title === 'Wall' &&
      moveSection(calc, inputsSection.id, -1) === calc
  );
}

// ---- Function-call steps (step 5) ----

{
  const calc = build(
    [
      numberInput('width', 3.6),
      { id: 'input-sheets', key: 'sheets', label: 'Sheets', widget: 'picker', value: { kind: 'material', default: 'mdf_6mm' } },
    ],
    [{ id: 'p', name: 'P' }],
    [expressionStep('p', 'cols', 'sheets_width(width, sheets)'), expressionStep('p', 'twice', 'cols * 2')]
  );

  const call = expressionToCall('sheets_width(width, sheets)', calc, functions);
  const withProperty = expressionToCall('area_rectangle(cols, sheets.width)', calc, functions);
  const constant = expressionToCall('spill(15)', calc, functions);
  assertCheck(
    'turns a formula that is one function call into a function-call step',
    call?.functionName === 'sheets_width' &&
      call.args.width.type === 'input' &&
      call.args.material.type === 'input' &&
      withProperty?.args.width.type === 'step' &&
      withProperty.args.height.type === 'property' &&
      constant?.args.spill.type === 'constant',
    JSON.stringify({ call, withProperty, constant })
  );
  assertCheck(
    "leaves formulas that aren't a single plain call as formulas",
    expressionToCall('sheets_width(width, sheets) * 2', calc, functions) === undefined &&
      expressionToCall('spill(width * 2)', calc, functions) === undefined &&
      expressionToCall('nope(width)', calc, functions) === undefined &&
      expressionToCall('area_rectangle(width)', calc, functions) === undefined
  );
  assertCheck(
    'writes a function-call step back as a formula, numbers in base units',
    callToExpression(withProperty!, functions) === 'area_rectangle(cols, sheets.width)' &&
      callToExpression({ type: 'call', functionName: 'spill', args: { spill: { type: 'constant', value: 60, unitSymbol: 'cm' } } }, functions) ===
        'spill(0.6)' &&
      callToExpression({ type: 'call', functionName: 'area_rectangle', args: { width: { type: 'input', key: 'width' } } }, functions) ===
        'area_rectangle(width, ?)'
  );

  const asCall = { ...calc, steps: calc.steps.map((step) => (step.key === 'cols' ? { ...step, source: call! } : step)) };
  const numberForMaterial = {
    ...calc,
    steps: calc.steps.map((step) =>
      step.key === 'cols'
        ? { ...step, source: { ...call!, args: { ...call!.args, material: { type: 'input' as const, key: 'width' } } } }
        : step
    ),
  };
  const asCallResult = evaluateCalculator(asCall, {}, library);
  const wrongKind = evaluateCalculator(numberForMaterial, {}, library);
  assertCheck(
    'a function-call step calculates like its formula; a material parameter must get a material input',
    close(asCallResult.steps['step-cols'].value, 3) &&
      close(asCallResult.steps['step-twice'].value, 6) &&
      wrongKind.steps['step-cols'].status === 'error' &&
      (wrongKind.steps['step-cols'].message ?? '').includes('needs a material input') &&
      evaluateCalculator({ ...calc, steps: [{ ...calc.steps[0], source: { type: 'call', functionName: '', args: {} } }] }, {}, library)
        .steps['step-cols'].message === 'Choose a function.',
    JSON.stringify(wrongKind.steps['step-cols'])
  );

  const explicit = getFunctionParamKinds({
    formula: 'crew.m_per_hr * hours',
    parameters: [
      { name: 'crew', label: 'Crew', kind: 'labor' },
      { name: 'hours', label: 'Hours' },
      { name: 'double', label: 'Double', kind: 'boolean' },
    ],
  });
  assertCheck(
    "a parameter's own kind wins over the one worked out from the formula",
    explicit.crew === 'labor' && explicit.hours === 'number' && explicit.double === 'boolean'
  );

  const savedCalc = { ...asCall, name: 'Sheeting calc' };
  const usage = findFunctionUsage('sheets_width', [], functions, undefined, [savedCalc, { ...calc, id: 'x', name: 'Formula calc' }]);
  assertCheck(
    'function usage lists calculators calling it, by step or formula',
    usage.calculators.map((item) => item.name).join(',') === 'Sheeting calc,Formula calc' &&
      describeFunctionUsage(usage).startsWith('Sheeting calc (calculator)') &&
      findFunctionUsage('spill', [], functions, undefined, [savedCalc]).calculators.length === 0
  );
}

// ---- Conditions (step 6) ----

{
  const insulation: CalculatorInput = { id: 'in-ins', key: 'insulation', label: 'Include insulation', widget: 'toggle', value: { kind: 'boolean' } };
  const finish: CalculatorInput = {
    id: 'in-fin',
    key: 'finish',
    label: 'Finish',
    widget: 'dropdown',
    value: { kind: 'choice', options: [{ id: 'matte', label: 'Matte', value: 1 }, { id: 'gloss', label: 'Gloss', value: 2 }], default: 'matte' },
  };
  const height: CalculatorInput = { id: 'in-h', key: 'height', label: 'Height', widget: 'number', value: { kind: 'number', unitSymbol: 'cm', default: 2.4 } };
  const paint: CalculatorInput = { id: 'in-p', key: 'paint', label: 'Paint', widget: 'picker', value: { kind: 'material', default: 'paint_2_7' } };
  const calc = build(
    [insulation, finish, height, { ...paint, visibleWhen: { inputKey: 'finish', op: 'isNot', value: 'matte' } }],
    [{ id: 'p', name: 'P', costStepId: 'step-ins' }],
    [
      expressionStep('p', 'ins', '100', { enabledWhen: { inputKey: 'insulation', op: 'is', value: true }, format: 'money' }),
      expressionStep('p', 'tall', 'height * 10', { enabledWhen: { inputKey: 'height', op: '>', value: 3 } }),
      expressionStep('p', 'glossy', 'finish', { enabledWhen: { inputKey: 'finish', op: '>=', value: 2 } }),
    ],
    { layout: [{ id: 's', visibleWhen: { inputKey: 'insulation', op: 'is', value: true }, items: [{ type: 'input', inputId: 'in-p' }] }] }
  );
  const off = evaluateCalculator(calc, {}, library);
  const on = evaluateCalculator(calc, { insulation: true, height: 3.5, finish: 'gloss' }, library);
  assertCheck(
    'steps calculate only when their condition holds: toggles, numbers in base units, choice values',
    off.steps['step-ins'].status === 'disabled' &&
      close(off.total, 0) &&
      off.steps['step-tall'].status === 'disabled' &&
      off.steps['step-glossy'].status === 'disabled' &&
      on.steps['step-ins'].status === 'ok' &&
      close(on.total, 100) &&
      close(on.steps['step-tall'].value, 35) &&
      close(on.steps['step-glossy'].value, 2),
    JSON.stringify({ off: off.steps, on: on.steps })
  );

  const catalog = { materials: library.materials, labor: [] };
  assertCheck(
    'describes conditions in words, numbers in the input unit',
    describeCondition({ inputKey: 'insulation', op: 'is', value: true }, calc, catalog) === 'Include insulation is on' &&
      describeCondition({ inputKey: 'insulation', op: 'is', value: false }, calc, catalog) === 'Include insulation is off' &&
      describeCondition({ inputKey: 'finish', op: 'isNot', value: 'matte' }, calc, catalog) === 'Finish is not Matte' &&
      describeCondition({ inputKey: 'height', op: '>', value: 3 }, calc, catalog) === 'Height > 300 cm' &&
      describeCondition({ inputKey: 'paint', op: 'is', value: 'paint_2_7' }, calc, catalog) === 'Paint is paint_2_7' &&
      describeCondition({ inputKey: 'gone', op: 'is', value: true }, calc, catalog).includes('deleted'),
    describeCondition({ inputKey: 'height', op: '>', value: 3 }, calc, catalog)
  );

  const withoutInsulation = removeInput(calc, 'in-ins');
  const withoutFinish = removeInput(calc, 'in-fin');
  assertCheck(
    'deleting an input clears the conditions that tested it, so nothing stays hidden for good',
    withoutInsulation.steps.find((step) => step.id === 'step-ins')?.enabledWhen === undefined &&
      withoutInsulation.layout[0].visibleWhen === undefined &&
      withoutFinish.inputs.find((input) => input.id === 'in-p')?.visibleWhen === undefined &&
      withoutFinish.steps.find((step) => step.id === 'step-tall')?.enabledWhen?.inputKey === 'height'
  );

  assertCheck(
    'offers every input but text notes and the input itself for a condition, starting from a sensible test',
    conditionInputs(calc, 'finish').map((input) => input.key).join(',') === 'insulation,height,paint' &&
      JSON.stringify(defaultCondition(insulation)) === JSON.stringify({ inputKey: 'insulation', op: 'is', value: true }) &&
      defaultCondition(finish).value === 'matte' &&
      defaultCondition(height).op === '>' &&
      setInputCondition(calc, 'in-p', undefined).inputs.find((input) => input.id === 'in-p')?.visibleWhen === undefined
  );
}

// ---- Catalog prices (step 7) ----

{
  assertCheck(
    'prices convert the opposite way to measurements; unknown units are labels',
    close(priceToBase(10, 'mm'), 10000) &&
      close(priceFromBase(10000, 'mm'), 10) &&
      close(priceToBase(10, 'm2'), 10) &&
      close(priceToBase(4200, 'pallet'), 4200) &&
      close(normalizePropertyValue(10, 'price', 'cm').storedValue, 1000) &&
      close(normalizePropertyValue(10, 'number', 'cm').storedValue, 0.1)
  );
  const oldStyle: Material = material('trim', 'Trim', 5, [
    { id: 'p1', name: 'price_per_mm', type: 'price', value: 0.05, unitSymbol: 'mm', storedValue: 0.00005 },
    { id: 'p2', name: 'width', type: 'number', value: 20, unitSymbol: 'mm', storedValue: 0.02 },
  ]);
  const fixed = fixPricePropertyStorage(oldStyle);
  assertCheck(
    'recomputes price properties stored like lengths, leaving other properties alone',
    close(fixed.properties![0].storedValue, 50) && close(fixed.properties![1].storedValue, 0.02) && close(propertyValueInUnit(fixed.properties![0]), 0.05)
  );

  const calc = build(
    [
      numberInput('width', 4),
      numberInput('height', 2.5),
      { id: 'input-sheets', key: 'sheets', label: 'Sheets', widget: 'picker', value: { kind: 'material', default: 'mdf_6mm' } },
    ],
    [{ id: 'p', name: 'Sheeting', costStepId: 'step-cost' }],
    [
      expressionStep('p', 'count', 'sheets_height(height, sheets) * sheets_width(width, sheets)'),
      expressionStep('p', 'cost', 'count * sheets.price', { format: 'money' }),
      expressionStep('p', 'per_m2', 'width * height * sheets.price_per_m2'),
      expressionStep('p', 'bare', 'count * sheets'),
    ]
  );
  const result = evaluateCalculator(calc, {}, library);
  assertCheck(
    '`.price` is the default price; a named price is used as is; a bare material in arithmetic asks which value',
    close(result.steps['step-cost'].value, 4 * 312.56) &&
      close(result.steps['step-per_m2'].value, 100) &&
      result.steps['step-count'].status === 'ok' &&
      result.steps['step-bare'].status === 'error' &&
      (result.steps['step-bare'].message ?? '').includes('sheets.price'),
    JSON.stringify(result.steps)
  );
  assertCheck(
    'getMaterialValue: a real property wins, `price` falls back to the default price',
    getMaterialValue(materials[1], 'price') === 312.56 && getMaterialValue(materials[0], 'price') === 37.9 && getMaterialValue(materials[1], 'nope') === null
  );

  // A module that reads the bare material as its price, like Sheet Installation.
  const sheetModule: CalculationModule = {
    id: 'sheet-install',
    name: 'Sheet Installation',
    fields: [
      { id: 's1', label: 'Width', type: 'number', variableName: 'width', unitSymbol: 'm' },
      { id: 's2', label: 'Height', type: 'number', variableName: 'height', unitSymbol: 'm' },
      { id: 's3', label: 'Sheets', type: 'material', variableName: 'sheets', materialCategory: 'Sheets' },
    ],
    formula: 'sheets_height(height, sheets) * sheets_width(width, sheets) * sheets',
    computedOutputs: [],
    createdAt: '',
    updatedAt: '',
  };
  const converted = calculatorFromModule(sheetModule, { createId }).calculator;
  const costStep = converted.steps.find((step) => step.key === 'cost')!;
  const convertedResult = evaluateCalculator(converted, { width: 4, height: 2.5, sheets: 'mdf_6mm' }, library);
  const moduleCost = calculateModuleInstance({
    moduleDef: sheetModule,
    fieldValues: { width: 4, height: 2.5, sheets: 'mdf_6mm' },
    materials,
    functions,
    roundCost: false,
  }).cost;
  assertCheck(
    'converting a module rewrites a bare material used as its price to `.price`, keeping the cost',
    costStep.source.type === 'expression' &&
      costStep.source.expression === 'sheets_height(height, sheets) * sheets_width(width, sheets) * sheets.price' &&
      close(convertedResult.total, moduleCost) &&
      close(moduleCost, 4 * 312.56),
    costStep.source.type === 'expression' ? costStep.source.expression : ''
  );

  const required = requiredProperties(
    {
      ...calc,
      steps: [
        ...calc.steps,
        {
          id: 'step-bound',
          partId: 'p',
          key: 'bound',
          label: 'Bound',
          source: { type: 'call', functionName: 'area_rectangle', args: { width: { type: 'property', inputKey: 'sheets', property: 'thickness' }, height: { type: 'input', key: 'height' } } },
        },
      ],
    },
    functions
  );
  assertCheck(
    'works out the properties read from a picked material: in formulas, bindings, and inside functions',
    required.get('sheets')?.join(',') === 'height,price_per_m2,thickness,width' &&
      missingProperties(materials[1], required.get('sheets')).join(',') === 'thickness' &&
      missingProperties(materials[0], required.get('sheets')).join(',') === 'height,price_per_m2,thickness' &&
      missingProperties(materials[0], undefined).length === 0,
    JSON.stringify([...required])
  );
}

// ---- Templates (step 8) ----

{
  const framing: CalculationModule = {
    id: 'framing',
    name: 'Framing',
    fields: [
      { id: 'f1', label: 'Width', type: 'number', variableName: 'width', unitSymbol: 'm' },
      { id: 'f2', label: 'Height', type: 'number', variableName: 'height', unitSymbol: 'm' },
      { id: 'f3', label: 'Stud Spacing', type: 'dropdown', variableName: 'stud_spacing', options: ['40', '60'], dropdownMode: 'numeric', unitSymbol: 'cm', defaultValue: 0.6 },
      { id: 'f4', label: 'Material', type: 'material', variableName: 'material', materialCategory: 'Lumber' },
      { id: 'f5', label: 'Quantity', type: 'number', variableName: 'quantity', defaultValue: 1 },
    ],
    formula: 'out.lumber_count * material.price',
    computedOutputs: [
      { id: 'o1', label: 'Lumber count', variableName: 'lumber_count', expression: '(perimeter_rectangle(width, height) + height * stud_count(width, stud_spacing)) * quantity', unitSymbol: 'm' },
    ],
    createdAt: '',
    updatedAt: '',
  };
  const sheeting: CalculationModule = {
    id: 'sheeting',
    name: 'Sheet Installation',
    fields: [
      { id: 's1', label: 'Width', type: 'number', variableName: 'width', unitSymbol: 'm' },
      { id: 's2', label: 'Height', type: 'number', variableName: 'height', unitSymbol: 'm' },
      { id: 's3', label: 'Sheets', type: 'material', variableName: 'sheets', materialCategory: 'Sheets' },
      { id: 's4', label: 'Quantity', type: 'number', variableName: 'quantity', defaultValue: 1 },
    ],
    formula: 'sheets_height(height, sheets) * sheets_width(width, sheets) * quantity * sheets',
    computedOutputs: [],
    createdAt: '',
    updatedAt: '',
  };
  const trim: CalculationModule = {
    id: 'trim',
    name: 'Trim',
    fields: [
      { id: 't1', label: 'Length', type: 'number', variableName: 'length', unitSymbol: 'm' },
      { id: 't2', label: 'Quantity', type: 'number', variableName: 'quantity', defaultValue: 3 },
    ],
    formula: 'length * quantity * 10',
    computedOutputs: [],
    createdAt: '',
    updatedAt: '',
  };
  const template: ModuleTemplate = {
    id: 'wall',
    name: 'Partition wall template',
    categories: ['Walls'],
    moduleInstances: [
      { id: 'i1', moduleId: 'framing' },
      {
        id: 'i2',
        moduleId: 'sheeting',
        fieldLinks: {
          width: { moduleInstanceId: 'i1', fieldVariableName: 'width' },
          height: { moduleInstanceId: 'i1', fieldVariableName: 'height' },
          quantity: { moduleInstanceId: 'i1', fieldVariableName: 'quantity' },
        },
      },
      // Linked to the framing output, and to a field of an instance that doesn't exist.
      {
        id: 'i3',
        moduleId: 'trim',
        fieldLinks: {
          length: { moduleInstanceId: 'i1', fieldVariableName: 'out.lumber_count' },
          quantity: { moduleInstanceId: 'gone', fieldVariableName: 'quantity' },
        },
      },
      { id: 'i4', moduleId: 'deleted-module' },
    ],
    createdAt: '',
    updatedAt: '',
  };
  const modules = [framing, sheeting, trim];
  const { calculator: wallCalc, warnings } = calculatorFromTemplate(template, modules, { createId });
  const values: CalculatorValues = { width: 4, height: 2.5, material: 'lumber_48x98', sheets: 'mdf_6mm' };
  const result = evaluateCalculator(wallCalc, values, library);

  const framingCost = calculateModuleInstance({ moduleDef: framing, fieldValues: { width: 4, height: 2.5, stud_spacing: 0.6, material: 'lumber_48x98', quantity: 1 }, materials, functions, roundCost: false });
  const sheetCost = calculateModuleInstance({ moduleDef: sheeting, fieldValues: { width: 4, height: 2.5, sheets: 'mdf_6mm', quantity: 1 }, materials, functions, roundCost: false }).cost;
  const trimCost = calculateModuleInstance({ moduleDef: trim, fieldValues: { length: framingCost.computedValues['out.lumber_count'], quantity: 3 }, materials, functions, roundCost: false }).cost;

  assertCheck(
    'turns a template into one calculator with a part per module and linked fields collapsed into one input',
    wallCalc.parts.map((part) => part.name).join(',') === 'Framing,Sheet Installation,Trim' &&
      wallCalc.inputs.map((input) => input.key).join(',') === 'width,height,stud_spacing,material,quantity,sheets,trim_quantity' &&
      wallCalc.inputs.find((input) => input.key === 'trim_quantity')?.label === 'Quantity (Trim)' &&
      wallCalc.steps.map((step) => step.key).join(',') === 'lumber_count,framing_cost,sheet_installation_cost,trim_cost' &&
      wallCalc.sourceTemplateId === 'wall' &&
      wallCalc.category === 'Walls',
    JSON.stringify({ inputs: wallCalc.inputs.map((input) => input.key), steps: wallCalc.steps.map((step) => step.key) })
  );
  const trimStep = wallCalc.steps.find((step) => step.key === 'trim_cost')!;
  const sheetStep = wallCalc.steps.find((step) => step.key === 'sheet_installation_cost')!;
  assertCheck(
    "rewrites each part's formulas to the shared names, and a link to an output reads that output's step",
    trimStep.source.type === 'expression' &&
      trimStep.source.expression === 'lumber_count * trim_quantity * 10' &&
      sheetStep.source.type === 'expression' &&
      sheetStep.source.expression === 'sheets_height(height, sheets) * sheets_width(width, sheets) * quantity * sheets.price',
    JSON.stringify(wallCalc.steps.map((step) => step.source))
  );
  assertCheck(
    'gives the same total as the modules calculated one by one with their links',
    close(result.parts[wallCalc.parts[0].id].cost, framingCost.cost) &&
      close(result.parts[wallCalc.parts[1].id].cost, sheetCost) &&
      close(result.parts[wallCalc.parts[2].id].cost, trimCost) &&
      close(result.total, framingCost.cost + sheetCost + trimCost),
    JSON.stringify({ total: result.total, parts: result.parts })
  );
  assertCheck(
    'warns about missing modules and broken links, and lays out a section per part plus the breakdown',
    warnings.some((warning) => warning.includes('Module 4')) &&
      warnings.some((warning) => warning.includes('"quantity"')) &&
      wallCalc.layout.map((section) => section.title).join(',') === 'Framing,Sheet Installation,Trim,Total' &&
      wallCalc.layout[1].items.length === 1 &&
      wallCalc.layout[3].items[0].type === 'breakdown',
    JSON.stringify({ warnings, layout: wallCalc.layout.map((section) => section.items.length) })
  );
  const live = calculatorsFromTemplates([template], modules);
  assertCheck(
    'converts templates on the fly with stable ids',
    live[0].id === 'template-wall' && JSON.stringify(calculatorsFromTemplates([template], modules)) === JSON.stringify(live)
  );
}

// ---- Send to quote (step 9) ----

{
  const money = (amount: number) => `${amount.toFixed(2)} kr`;
  const values: CalculatorValues = { ...wallValues };
  const result = evaluateCalculator(wall, values, library);
  const outcome = buildCalculatorLineItem({ calculator: wall, values, result, library, formatMoney: money, nickname: ' North wall ', id: 'line-1', now: 'now' });
  const line = outcome.ok ? outcome.lineItem : undefined;
  assertCheck(
    "turns a calculator's result into a quote line with its cost, values, summary and details",
    !!line &&
      line.calculatorId === wall.id &&
      line.moduleName === 'Partition wall' &&
      line.nickname === 'North wall' &&
      close(line.cost, 2716.56) &&
      line.calculatorValues?.width === 4 &&
      line.primarySummary === 'Paint area 10 m² · Framing 28 m · Sheet count 4 pcs' &&
      (line.secondarySummary ?? '').startsWith('Width: 4 m · Height: 2.5 m · Stud spacing: 60 cm · Lumber: lumber_48x98') &&
      line.details?.some((detail) => detail.label === 'Cost' && detail.value === '2716.56 kr') === true &&
      line.details?.some((detail) => detail.label === 'Sheeting on both sides' && detail.value === 'No') === true,
    JSON.stringify(line)
  );

  const incomplete = buildCalculatorLineItem({ calculator: wall, values: { width: 4 }, result: evaluateCalculator(wall, { width: 4 }, library), library, formatMoney: money });
  assertCheck(
    'refuses a line without a total, naming what to fill in',
    !incomplete.ok && incomplete.error.startsWith('Fill in Height')
  );

  const quote: Quote = {
    id: 'q', name: 'Q', workspaceModules: [], lineItems: [], subtotal: 0, markupPercent: 10, markupAmount: 0, taxRate: 0.25, taxAmount: 0, total: 0, createdAt: '', updatedAt: '',
  };
  const added = putLineItem(quote, line!);
  const replaced = putLineItem(added, { ...line!, id: 'other', cost: 100 }, 'line-1');
  const appended = putLineItem(added, { ...line!, id: 'line-2' }, 'missing');
  assertCheck(
    'adds a line or replaces one in place, and works out the totals again',
    added.lineItems.length === 1 &&
      close(added.subtotal, 2716.56) &&
      close(added.markupAmount, 271.66) &&
      close(added.taxAmount, roundMoney((2716.56 + 271.66) * 0.25)) &&
      close(added.total, added.subtotal + added.markupAmount + added.taxAmount) &&
      replaced.lineItems.length === 1 &&
      replaced.lineItems[0].id === 'line-1' &&
      close(replaced.subtotal, 100) &&
      appended.lineItems.length === 2
  );
}
