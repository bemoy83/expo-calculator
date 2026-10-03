import { parseExpression } from '../formula/expression-tree';
import { analyzeUnits, declaredUnitProblem, describeDim, type UnitResolver } from '../formula/unit-analysis';
import type { UnitCategory } from '../units';
import { assertCheck } from './test-helpers';

console.log('\n=== Unit Analysis Regression ===');

const UNITS: Record<string, UnitCategory> = {
  bredde: 'length',
  høyde: 'length',
  gulv: 'area',
  rom: 'volume',
  vekt: 'weight',
  antall: 'count',
  margin: 'percentage',
  'plate.bredde': 'length',
  'plate.areal': 'area',
};
const resolver: UnitResolver = {
  value: (base, property) => UNITS[property ? `${base}.${property}` : base],
  call: (name) => (name === 'areal' ? 'area' : undefined),
};
const run = (formula: string) => analyzeUnits(formula, resolver);
const resultOf = (formula: string) => {
  const { result } = run(formula);
  return result ? describeDim(result) : null;
};

assertCheck('reads positions into a tree', (() => {
  const tree = parseExpression('a + b * 2');
  return tree?.type === 'bin' && tree.op === '+' && tree.right.type === 'bin' && tree.right.from === 4 && tree.to === 9;
})());
assertCheck('reads calls, properties, unary minus, ^ and ?:', [
  'ceil(plate.bredde / 2)', '-bredde ^ 2', 'antall > 0 ? bredde : 0', 'round(bredde, 2)', 'a and not b',
].every((formula) => parseExpression(formula) !== null));
assertCheck('leaves what it cannot read alone', ['2 bredde', 'bredde +', '"x"', '', '(bredde'].every((formula) => parseExpression(formula) === null));

assertCheck('length × length is an area', resultOf('bredde * høyde') === 'area');
assertCheck('area × length is a volume', resultOf('gulv * høyde') === 'volume');
assertCheck('area ÷ length is a length', resultOf('gulv / bredde') === 'length');
assertCheck('length ÷ length is unitless', resultOf('bredde / høyde') === 'unitless');
assertCheck('a bare number scales a unit', resultOf('2 * bredde + 10') === 'length');
assertCheck('a count beside a unit is neutral', resultOf('bredde * antall') === 'length' && resultOf('bredde + antall') === 'length');
assertCheck('a percentage is unitless', resultOf('gulv * (1 + margin)') === 'area');
assertCheck('powers follow the exponent', resultOf('bredde ^ 2') === 'area' && resultOf('bredde ^ 3') === 'volume' && resultOf('(bredde * høyde) ^ 0.5') === null);
assertCheck('sqrt halves an even power', resultOf('sqrt(gulv)') === 'length' && resultOf('sqrt(bredde)') === null);
assertCheck('rounding keeps the unit', resultOf('ceil(gulv / 2)') === 'area' && resultOf('round(bredde, 2)') === 'length');
assertCheck('a function gives its return unit', resultOf('areal(bredde, høyde) * 2') === 'area');
assertCheck('an unknown name makes the rest unknown', resultOf('bredde * mystery') === null && run('bredde * mystery + gulv').problems.length === 0);
assertCheck('properties are looked up', resultOf('plate.bredde * plate.bredde') === 'area');
assertCheck('a condition keeps the unit beside a bare 0', resultOf('antall > 0 ? bredde : 0') === 'length');
assertCheck('weight per volume reads in words', describeDim({ L: -3, M: 1 }) === 'weight per volume');

const adding = run('bredde + gulv');
assertCheck(
  'adding a length to an area is a problem on the whole sum',
  adding.problems.length === 1 && adding.problems[0].from === 0 && adding.problems[0].to === 13 && /bredde is a length but gulv is an area/.test(adding.problems[0].message),
  adding.problems[0]?.message
);
assertCheck('subtracting and comparing unlike units are problems', run('gulv - bredde').problems.length === 1 && run('bredde > gulv').problems.length === 1);
assertCheck('min of unlike units is a problem', run('min(bredde, gulv)').problems.length === 1);
assertCheck('like units and neutral numbers are no problem', run('bredde + høyde + 5 + antall').problems.length === 0 && run('bredde > 5').problems.length === 0);
assertCheck('area × area is flagged', run('gulv * gulv').problems.length === 1);
assertCheck('a problem inside a call is found', run('ceil((bredde + gulv) / 2)').problems.length === 1);

const notes = run('bredde * høyde');
assertCheck('an operator says what it works out to', notes.notes.length === 1 && notes.notes[0].text === 'length × length → area' && notes.notes[0].from === 7, notes.notes[0]?.text);
assertCheck('a number is named as a number', run('bredde * 2').notes[0]?.text === 'length × a number → length');

const declared = (formula: string, category: UnitCategory | undefined, symbol?: string) =>
  declaredUnitProblem(formula, run(formula), { category, symbol }, 'the step is set to');
const wrong = declared(' bredde + høyde ', 'area', 'm²');
assertCheck(
  'a result of another kind than declared is a problem on the whole formula',
  !!wrong && wrong.from === 1 && wrong.to === 15 && wrong.message === 'This works out to a length, but the step is set to m² (area).',
  wrong?.message
);
assertCheck('a matching, unitless or unknown result is not', declared('bredde * høyde', 'area') === null && declared('antall * 2', 'area') === null && declared('mystery * 2', 'area') === null);
assertCheck('no declared unit means no problem', declared('bredde * høyde', undefined) === null);
assertCheck('a measurement where a count is declared is a problem', declared('bredde * høyde', 'count', 'pcs') !== null);
