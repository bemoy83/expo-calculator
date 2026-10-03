import { labelFromName, nameAfterLabelChange } from '../utils/function-parameters';
import { unknownValueNames } from '../calculator/formula-tokens';
import { findFormulaErrorRange, findSyntaxProblem } from '../formula/error-location';
import { foldName } from '../formula/identifiers';
import { caretAfterTidy } from '../formula/prettify';
import { classifyFormulaIssues, formulaStatus } from '../functions/formula-issues';
import { addSuggestedParameter, getParameterSuggestions, findStoredParametersNamed, parameterNeedsDefinition, planUnknownNames } from '../functions/parameter-suggestions';
import { buildFunctionSaveData, validateFunctionEditorForm } from '../functions/function-form';
import { collectFunctionAutocompleteCandidates, getPropertyCandidatesForBase } from '../functions/autocomplete-candidates';
import { findUnknownMaterialProperties } from '../functions/material-properties';
import { getFormulaWithInsertedOperator, renameFormulaName, getFormulaWithInsertedToken } from '../formula/edits';
import { categoryForName, resolveMaterialCategory } from '../utils/material-category';
import type { Calculator } from '../calculator/types';
import type { Labor, SharedFunction } from '../types';
import { assertCheck } from './test-helpers';

console.log('\n=== Function Editor Helper Regression ===');

const inputCalculators = [
  {
    inputs: [
      { key: 'width', label: 'Width', value: { kind: 'number', unitSymbol: 'mm', unitCategory: 'length' } },
      { key: 'board', label: 'Board', value: { kind: 'material' } },
    ],
  },
  {
    inputs: [
      { key: 'depth', label: 'Depth', value: { kind: 'number' } },
      { key: 'note', label: 'Note', value: { kind: 'text' } },
    ],
  },
] as unknown as Calculator[];
const otherFunctions = [
  { id: 'self', name: 'self', parameters: [{ name: 'own', label: 'Own' }] },
  { id: 'a', name: 'a', parameters: [{ name: 'width', label: 'Wall width', unitSymbol: 'mm', unitCategory: 'length' }, { name: 'height', label: 'Height', unitSymbol: 'm' }] },
  { id: 'b', name: 'b', parameters: [{ name: 'height', label: 'Height', unitSymbol: 'mm' }] },
] as unknown as SharedFunction[];
const suggestions = getParameterSuggestions(otherFunctions, inputCalculators, 'self');
assertCheck(
  "suggests other functions' parameters, then calculator inputs, each once, grouped by kind, not the function's own",
  suggestions.map((param) => `${param.name}:${param.group}:${param.unitSymbol ?? ''}`).join(',') ===
    'width:number:mm,depth:number:,height:number:m,height:number:mm,board:material:' &&
    suggestions.find((param) => param.name === 'width')?.label === 'Wall width',
  JSON.stringify(suggestions)
);

const dupFunctions = [
  { id: 'x', name: 'x', formula: 'a', parameters: [{ name: 'bredde', label: 'Bredde', unitSymbol: 'm' }, { name: 'høyde', label: 'Høyde' }] },
  { id: 'y', name: 'y', formula: 'a', parameters: [{ name: 'bredde', label: 'Bredde', kind: 'number', unitSymbol: 'm' }, { name: 'høyde', label: 'Høyde', kind: 'number', unitSymbol: 'm' }] },
  { id: 'z', name: 'z', formula: 'plate.width', parameters: [{ name: 'plate', label: 'Plate' }] },
] as unknown as SharedFunction[];
const deduped = getParameterSuggestions(dupFunctions, [], 'self');
assertCheck(
  'unset and number kinds are one, a unitless name folds into the one with a unit, material inferred, uses counted',
  deduped.map((param) => `${param.name}:${param.group}:${param.unitSymbol ?? ''}:${param.uses}`).join(',') ===
    'bredde:number:m:2,høyde:number:m:2,plate:material::1',
  JSON.stringify(deduped)
);

const blankStart = [{ name: '', label: '', required: true }];
const parameters = addSuggestedParameter(addSuggestedParameter(blankStart, suggestions[0]), suggestions[2]);
assertCheck(
  'adds a suggested parameter with its unit, filling the blank one first, without duplicates or list fields',
  parameters.length === 2 &&
    parameters[0].name === 'width' &&
    parameters[0].unitSymbol === 'mm' &&
    parameters[0].label === 'Wall width' &&
    parameters[1].unitSymbol === 'm' &&
    !('group' in parameters[0]) &&
    !('uses' in parameters[0]) &&
    addSuggestedParameter(parameters, { ...suggestions[3], name: 'HEIGHT' }) === parameters,
  JSON.stringify(parameters)
);

const functions: SharedFunction[] = [
  {
    id: 'fn-current',
    displayName: 'Current',
    name: 'current_fn',
    formula: 'width',
    parameters: [{ name: 'width', label: 'Width' }],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fn-other',
    displayName: 'Other',
    name: 'other_fn',
    formula: 'x * 2',
    parameters: [{ name: 'x', label: 'X' }],
    createdAt: '',
    updatedAt: '',
  },
];
const labor: Labor[] = [
  {
    id: 'labor',
    name: 'Installer',
    category: 'install',
    cost: 100,
    variableName: 'installer',
    properties: [
      {
        id: 'rate',
        name: 'm2_per_hr',
        type: 'number',
        value: 12,
        unitSymbol: 'm2',
      },
    ],
    createdAt: '',
    updatedAt: '',
  },
];
const candidates = collectFunctionAutocompleteCandidates({
  parameters,
  functions,
  functionId: 'fn-current',
  labor,
});
assertCheck(
  'builds function autocomplete candidates',
  candidates.some((candidate) => candidate.name === 'height' && candidate.type === 'field') &&
    candidates.some((candidate) => candidate.name === 'round' && candidate.type === 'function') &&
    candidates.some((candidate) => candidate.name === 'other_fn' && candidate.functionSignature === 'x') &&
    !candidates.some((candidate) => candidate.name === 'current_fn') &&
    candidates.some((candidate) => candidate.name === 'installer.m2_per_hr')
);

const catalogMaterials = [
  { id: 'm1', name: 'Board', variableName: 'board', price: 1, properties: [{ id: 'p1', name: 'width', type: 'number', value: 1, unitSymbol: 'mm' }] },
  { id: 'm2', name: 'Screw', variableName: 'screw', price: 1, properties: [{ id: 'p2', name: 'pitch', type: 'number', value: 1 }] },
] as unknown as import('../types').Material[];
const materialParams = [
  { name: 'board', label: 'Board', kind: 'material', required: true },
  { name: 'auto', label: 'Auto', required: true },
  { name: 'n', label: 'N', kind: 'number', required: true },
] as unknown as import('../types').SharedFunction['parameters'];
const forBase = (base: string) =>
  getPropertyCandidatesForBase({ base, parameters: materialParams, materials: catalogMaterials, labor: [], functions: [] }).map((c) => c.name);
assertCheck(
  'offers the catalog\'s own properties after the dot for material, automatic and not-yet-declared names, not numbers',
  forBase('board').includes('board.width') &&
    forBase('board').includes('board.pitch') &&
    !forBase('board').includes('board.thickness') &&
    forBase('auto').includes('auto.width') &&
    forBase('plank').includes('plank.width') &&
    forBase('n').length > 0 === false
);
const typos = findUnknownMaterialProperties({ formula: 'board.widht + board.pitch + n', parameters: materialParams, materials: catalogMaterials });
assertCheck(
  'flags a property no material has and suggests the near one',
  typos.length === 1 && typos[0].reference === 'board.widht' && typos[0].suggestion === 'width'
);

const categorised = [
  { id: 'a', name: 'Gyproc', category: 'Sheets', variableName: 'gyproc', price: 1, properties: [{ id: 'p1', name: 'width', type: 'number', value: 1 }] },
  { id: 'b', name: 'Screw', category: 'Fasteners', variableName: 'screw', price: 1, properties: [{ id: 'p2', name: 'pitch', type: 'number', value: 1 }] },
] as unknown as import('../types').Material[];
const sheetProps = getPropertyCandidatesForBase({
  base: 'sheets',
  parameters: [{ name: 'sheets', label: 'Sheets', kind: 'material', materialCategory: 'sheets', required: true }] as unknown as import('../types').SharedFunction['parameters'],
  materials: categorised,
  labor: [],
  functions: [],
}).filter((c) => c.description?.startsWith('On '));
assertCheck(
  'a material parameter with a category suggests only that category\'s properties',
  sheetProps.length === 1 && sheetProps[0].name === 'sheets.width'
);
const undeclared = getPropertyCandidatesForBase({ base: 'sheets', parameters: [], materials: categorised, labor: [], functions: [] }).filter((c) => c.description?.startsWith('On '));
assertCheck(
  'an undeclared name that is a category suggests only that category\'s properties',
  undeclared.length === 1 && undeclared[0].name === 'sheets.width'
);
assertCheck(
  'category helpers: empty is uncategorised, case snaps, near misses nudge',
  resolveMaterialCategory('', ['Sheets']).value === 'Uncategorised' &&
    resolveMaterialCategory(' sheets ', ['Sheets']).value === 'Sheets' &&
    resolveMaterialCategory('Sheet', ['Sheets']).didYouMean === 'Sheets' &&
    resolveMaterialCategory('Insulation', ['Sheets']).didYouMean === undefined &&
    categoryForName('sheet', ['Sheets', 'Fasteners']) === 'Sheets'
);

const insertedToken = getFormulaWithInsertedToken({
  currentValue: 'width+',
  start: 6,
  end: 6,
  token: 'height',
});
assertCheck(
  'calculates function formula token insertion',
  insertedToken.value === 'width+height' &&
    insertedToken.cursorPosition === 12
);

const insertedOperator = getFormulaWithInsertedOperator({
  currentValue: 'widthheight',
  start: 5,
  end: 5,
  operator: '*',
});
assertCheck(
  'calculates function formula operator insertion',
  insertedOperator.value === 'width * height' &&
    insertedOperator.cursorPosition === 8
);

const insert = (currentValue: string, start: number, end: number, operator: string) =>
  getFormulaWithInsertedOperator({ currentValue, start, end, operator });
const atEnd = insert('width', 5, 5, '*');
const afterSpace = insert('width ', 6, 6, '+');
const atStart = insert('', 0, 0, '-');
assertCheck(
  'an operator gets a space on each side, including at the end, so the next value follows',
  atEnd.value === 'width * ' && atEnd.cursorPosition === 8 &&
    afterSpace.value === 'width + ' && afterSpace.cursorPosition === 8 &&
    atStart.value === '- ' && atStart.cursorPosition === 2,
  JSON.stringify([atEnd, afterSpace, atStart])
);
const emptyRound = insert('', 0, 0, 'round()');
const afterTimes = insert('2 * ', 4, 4, 'ceil()');
const roundDecimals = insert('', 0, 0, 'round(, )');
const wrapped = insert('width * height + 1', 0, 14, 'round()');
const wrappedDecimals = insert('area', 0, 4, 'round(, )');
const grouped = insert('2 * width + height', 4, 18, '()');
assertCheck(
  'a function or brackets put the cursor inside, or wrap the selection and put it where the next thing goes',
  emptyRound.value === 'round()' && emptyRound.cursorPosition === 6 &&
    afterTimes.value === '2 * ceil()' && afterTimes.cursorPosition === 9 &&
    roundDecimals.value === 'round(, )' && roundDecimals.cursorPosition === 6 &&
    wrapped.value === 'round(width * height) + 1' && wrapped.cursorPosition === 21 &&
    wrappedDecimals.value === 'round(area, )' && wrappedDecimals.cursorPosition === 12 &&
    grouped.value === '2 * (width + height)' && grouped.cursorPosition === 20,
  JSON.stringify([emptyRound, afterTimes, roundDecimals, wrapped, wrappedDecimals, grouped])
);

const wrappedCompare = insert('bredde / cc', 0, 11, '==');
const wrappedCompareMid = insert('2 * tax', 4, 7, '>=');
const plainCompare = insert('tax', 3, 3, '==');
assertCheck(
  'a comparison wraps a selection as a condition, and with nothing selected goes in with spaces',
  wrappedCompare.value === '(bredde / cc == )' && wrappedCompare.cursorPosition === 16 &&
    wrappedCompareMid.value === '2 * (tax >= )' && wrappedCompareMid.cursorPosition === 12 &&
    plainCompare.value === 'tax == ',
  JSON.stringify([wrappedCompare, wrappedCompareMid, plainCompare])
);

const errorAt = (formula: string) => JSON.stringify(findFormulaErrorRange(formula));
assertCheck(
  'a syntax problem is found even when the formula also names something that does not exist',
  findSyntaxProblem('hoyd * 2 +') === 'The formula stops too early. A value is missing after the last operator.' &&
    findSyntaxProblem('hoyd * 2') === null &&
    findSyntaxProblem('') === null,
  String(findSyntaxProblem('hoyd * 2 +'))
);
assertCheck(
  'a syntax error is located in the formula as written, names and all',
  errorAt('ceil(bredde / cc') === '{"start":0,"end":5}' &&
    errorAt('bredde / ') === '{"start":7,"end":8}' &&
    errorAt('(1 + )') === '{"start":5,"end":6}' &&
    errorAt('2 3') === '{"start":2,"end":3}' &&
    errorAt('a + * b') === '{"start":4,"end":5}' &&
    errorAt('a + b)') === '{"start":5,"end":6}' &&
    errorAt('høyde * (bredde') === '{"start":8,"end":9}' &&
    errorAt('a +') === '{"start":2,"end":3}' &&
    errorAt('board.width * 2') === 'null' &&
    errorAt('') === 'null',
  JSON.stringify(['ceil(bredde / cc', 'bredde / ', '(1 + )', '2 3', 'a + * b', 'a + b)', 'høyde * (bredde', 'a +'].map(errorAt))
);

const storedParameters = getParameterSuggestions(
  [
    { id: 'f1', name: 'area', displayName: 'Area', formula: 'høyde * bredde', category: 'x', parameters: [{ name: 'høyde', label: 'Høyde', unitSymbol: 'mm', required: true }, { name: 'bredde', label: 'Bredde', required: true }] } as unknown as SharedFunction,
    { id: 'f2', name: 'wall', displayName: 'Wall', formula: 'høyde * 2', category: 'x', parameters: [{ name: 'høyde', label: 'Høyde', unitSymbol: 'mm', required: true }] } as unknown as SharedFunction,
  ],
  []
);
const named = (name: string, asMaterial = false) =>
  findStoredParametersNamed(name, storedParameters, asMaterial).map((item) => `${item.name}:${item.uses}`).join(',');
assertCheck(
  'a name the formula uses is matched to stored parameters of the same name, not to near misses',
  named('høyde') === 'høyde:2' &&
    named('Høyde') === 'høyde:2' &&
    named('hoyde') === 'høyde:2' &&
    named('hoyd') === '' &&
    named('høyde', true) === '' &&
    named('') === '',
  JSON.stringify([named('høyde'), named('hoyde'), named('hoyd'), named('høyde', true)])
);
assertCheck(
  'renaming a name in a formula leaves longer names and properties alone',
  renameFormulaName('hoyde * (hoyde + hoyde_2) + board.hoyde', 'hoyde', 'høyde') === 'høyde * (høyde + hoyde_2) + board.hoyde' &&
    renameFormulaName('ceil(hoyde)', 'hoyde', 'høyde') === 'ceil(høyde)' &&
    renameFormulaName('a + b', 'a', 'a') === 'a + b',
  renameFormulaName('hoyde * (hoyde + hoyde_2) + board.hoyde', 'hoyde', 'høyde')
);

const withStored = collectFunctionAutocompleteCandidates({
  parameters: [{ name: 'bredde', label: 'Bredde', required: true }],
  functions: [],
  functionId: 'new',
  labor: [],
  stored: storedParameters.concat([{ name: 'bredde', label: 'Bredde', group: 'number', uses: 4, required: true }]),
});
const storedOnes = withStored.filter((candidate) => candidate.storedKey);
assertCheck(
  'typed names offer stored parameters this function lacks, not ones it has, and tag them to be added on insert',
  storedOnes.map((candidate) => candidate.name).join(',') === 'høyde' &&
    storedOnes[0].displayName === 'høyde (mm)' &&
    storedOnes[0].storedKey === 'høyde|number|mm' &&
    withStored.filter((candidate) => candidate.name === 'bredde').length === 1,
  JSON.stringify(storedOnes)
);
assertCheck(
  'names compare without case or æøå',
  foldName('Høyde') === 'hoyde' && foldName('Ærfugl') === 'aerfugl' && foldName('Årstall') === 'arstall',
  [foldName('Høyde'), foldName('Ærfugl'), foldName('Årstall')].join(',')
);

assertCheck(
  'a parameter needs defining until it has a unit or expects something, and a material until it has a category',
  parameterNeedsDefinition({ name: '', label: '', required: true }) &&
    parameterNeedsDefinition({ name: 'bredde', label: 'Bredde', required: true }) &&
    !parameterNeedsDefinition({ name: 'bredde', label: 'Bredde', required: true, unitSymbol: 'mm' }) &&
    !parameterNeedsDefinition({ name: 'antall', label: 'Antall', required: true, kind: 'number' }) &&
    parameterNeedsDefinition({ name: 'plate', label: 'Plate', required: true, kind: 'material' }) &&
    !parameterNeedsDefinition({ name: 'plate', label: 'Plate', required: true, kind: 'material', materialCategory: 'Gips' }) &&
    !parameterNeedsDefinition({ name: 'crew', label: 'Crew', required: true, kind: 'labor' })
);

const twoUnits = getParameterSuggestions(
  [
    { id: 'u1', name: 'a', displayName: 'A', formula: 'x', category: 'x', parameters: [{ name: 'lengde', label: 'Lengde', unitSymbol: 'mm', required: true }] } as unknown as SharedFunction,
    { id: 'u2', name: 'b', displayName: 'B', formula: 'x', category: 'x', parameters: [{ name: 'lengde', label: 'Lengde', unitSymbol: 'm', required: true }, { name: 'høyde', label: 'Høyde', required: true }] } as unknown as SharedFunction,
  ],
  []
);
const bulkPlan = planUnknownNames(['hoyde', 'lengde', 'dybde', 'tykkelse'], 'hoyde + lengde + dybde + tykkelse', twoUnits);
assertCheck(
  'a bulk plan reuses names with one stored match, creates ones with none, and leaves ambiguous ones to choose',
  bulkPlan.reuse.map((item) => `${item.name}>${item.stored.name}`).join(',') === 'hoyde>høyde' &&
    bulkPlan.create.join(',') === 'dybde,tykkelse' &&
    bulkPlan.choose.join(',') === 'lengde',
  JSON.stringify({ reuse: bulkPlan.reuse.map((item) => item.name), create: bulkPlan.create, choose: bulkPlan.choose })
);

assertCheck(
  'a caret keeps its place among the characters when a formula is tidied',
  caretAfterTidy('a+b', 2, 'a + b') === 3 &&
    caretAfterTidy('ceil(a/b)+1', 5, 'ceil(a / b) + 1') === 5 &&
    caretAfterTidy('a+b', 0, 'a + b') === 0 &&
    caretAfterTidy('a+b', 3, 'a + b') === 5,
  [caretAfterTidy('a+b', 2, 'a + b'), caretAfterTidy('ceil(a/b)+1', 5, 'ceil(a / b) + 1'), caretAfterTidy('a+b', 3, 'a + b')].join(',')
);

const issuesOf = (input: Partial<Parameters<typeof classifyFormulaIssues>[0]>) =>
  classifyFormulaIssues({ validation: { valid: true }, unknownNames: [], unusedParameters: [], ...input });
const brokenIssues = issuesOf({ validation: { valid: false, error: 'A bracket is never closed.', errorKind: 'broken' } });
const namesIssues = issuesOf({
  validation: { valid: false, error: 'Undefined variable: hoyd', errorKind: 'unresolved' },
  unknownNames: ['hoyd', 'dybde'],
});
const bothIssues = issuesOf({
  validation: { valid: false, error: 'Undefined variable: hoyd', errorKind: 'unresolved' },
  unknownNames: ['hoyd'],
  syntaxProblem: 'The formula stops too early.',
});
const functionIssues = issuesOf({ validation: { valid: false, error: "Function 'foo' not found", errorKind: 'unresolved' } });
const notesIssues = issuesOf({ propertyHint: 'Did you mean board.width?', unusedParameters: ['a', 'b'] });
assertCheck(
  'formula problems are sorted by what they mean: broken, unresolved (a name that does not exist yet), or a heads-up',
  brokenIssues.map((i) => i.level).join() === 'broken' &&
    namesIssues.map((i) => `${i.level}:${i.name}`).join() === 'unresolved:hoyd,unresolved:dybde' &&
    functionIssues.map((i) => i.level).join() === 'unresolved' &&
    bothIssues.map((i) => i.level).join() === 'broken,unresolved' &&
    formulaStatus(bothIssues).label === 'Formula has an error' &&
    notesIssues.map((i) => i.level).join() === 'heads-up,heads-up' &&
    notesIssues[1].message === 'a, b aren’t used by the formula.' &&
    issuesOf({ validation: { valid: false, pending: true, error: 'x' } }).length === 0,
  JSON.stringify([brokenIssues, namesIssues, functionIssues, notesIssues])
);
assertCheck(
  'the header says the most serious thing: error, then what is missing, then notes',
  formulaStatus(brokenIssues).label === 'Formula has an error' &&
    formulaStatus(namesIssues).label === 'Needs 2 parameters' &&
    formulaStatus(functionIssues).label === '1 thing to resolve' &&
    formulaStatus(notesIssues).label === 'Formula works · 2 notes' &&
    formulaStatus([]).label === 'Formula works' &&
    formulaStatus([...brokenIssues, ...namesIssues]).tone === 'error' &&
    formulaStatus(namesIssues).tone === 'attention',
  JSON.stringify([formulaStatus(brokenIssues), formulaStatus(namesIssues), formulaStatus(functionIssues), formulaStatus(notesIssues)])
);

const validation = validateFunctionEditorForm({
  formData: {
    displayName: 'Area',
    name: 'area',
    description: '',
    formula: 'width * height',
    category: '',
  },
  parameters,
  formulaValidation: { valid: true },
  functions,
  functionId: 'new',
});
const saveData = buildFunctionSaveData({
  formData: {
    displayName: ' Area ',
    name: ' area ',
    description: ' ',
    formula: ' width * height ',
    category: ' Geometry ',
  },
  validParameters: validation.validParameters,
});
assertCheck(
  'validates and serializes function save data',
  Object.keys(validation.errors).length === 0 &&
    saveData.displayName === 'Area' &&
    saveData.name === 'area' &&
    saveData.formula === 'width * height' &&
    saveData.category === 'Geometry'
);

// A parameter's chosen kind ("Expects") is saved; one left on Automatic stays unset.
const kindSaveData = buildFunctionSaveData({
  formData: { displayName: 'Sheets', name: 'sheets', description: '', formula: 'area / board.width', category: '' },
  validParameters: [
    { name: 'area', label: 'Area', kind: 'number' },
    { name: 'board', label: 'Board', kind: 'material' },
    { name: 'painted', label: 'Painted', kind: 'boolean' },
    { name: 'waste', label: 'Waste' },
  ],
});
assertCheck(
  'saves each parameter’s chosen kind and leaves Automatic unset',
  kindSaveData.parameters.map((param) => param.kind).join(',') === 'number,material,boolean,' &&
    !('kind' in kindSaveData.parameters[3])
);

// Editing a parameter's label renames it only while the formula doesn't use the name.
{
  const params = [{ name: 'cc', label: 'CC' }, { name: 'bredde', label: 'Width' }];
  const renamed = nameAfterLabelChange({ parameters: params, index: 0, label: 'Spacing', inUse: false });
  const kept = nameAfterLabelChange({ parameters: params, index: 0, label: 'CCx', inUse: true });
  const custom = nameAfterLabelChange({ parameters: params, index: 1, label: 'Wall width', inUse: false });
  const empty = nameAfterLabelChange({ parameters: [{ name: '', label: '' }], index: 0, label: 'Height', inUse: false });
  assertCheck(
    'a new label renames an unused parameter, keeps a name the formula uses or one typed by hand',
    renamed === 'spacing' && kept === 'cc' && custom === 'bredde' && empty === 'height'
  );
}

// "+ Create parameter" in the function editor: the names nothing matches, once each, in order.
{
  const names = { inputs: new Set(['bredde']), results: new Set<string>(), functions: new Set(['stender']), catalog: new Set(['kvirke']) };
  const unknown = unknownValueNames('ceil(bredde / cc) + cc * board.width + kvirke.price + rond(2) + pi + stender(1)', names);
  assertCheck(
    'lists unknown names that could be parameters: once each, board for board.width, not calls or constants',
    unknown.join(',') === 'cc,board' &&
      labelFromName('stud_spacing') === 'Stud spacing' &&
      labelFromName('bredde') === 'Bredde' &&
      labelFromName('høyde') === 'Høyde'
  );
}
