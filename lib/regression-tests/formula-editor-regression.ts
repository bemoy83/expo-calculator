import { callAtCaret, parseCalls } from '../calculator/call-context';
import { scanExpression } from '../calculator/dependencies';
import { tokenize } from '../formula/tokens';
import { analyzeStepFormula, stepDiagnostics, stepExpression } from '../calculator/step-analysis';
import { collectDiagnostics, plainSyntaxMessage } from '../formula/diagnostics';
import { minimalChange } from '../formula/minimal-change';
import { assertCheck } from './test-helpers';

console.log('\n=== Formula Editor Helpers Regression ===');

// Which call the caret is in, and which argument.
const at = (doc: string, caret: number) => callAtCaret(doc, caret);
assertCheck('no call: the caret is outside any brackets', at('a + b', 3) === null && at('f(a) + b', 6) === null);
assertCheck('the caret just after the "(" is in the first argument', at('f(a, b)', 2)?.argIndex === 0 && at('f(a, b)', 2)?.name === 'f');
assertCheck('after a comma it is in the next argument', at('f(a, b)', 5)?.argIndex === 1 && at('f(a, b)', 6)?.argIndex === 1);
assertCheck('just after the ")" is outside the call', at('f(a, b)', 7) === null);
assertCheck('the innermost call wins', (() => {
  const found = at('f(a, g(b, c))', 10);
  return found?.name === 'g' && found.argIndex === 1;
})());
assertCheck('after an inner call it is back in the outer one', at('f(g(a), b)', 9)?.name === 'f' && at('f(g(a), b)', 9)?.argIndex === 1);
assertCheck('a call still being typed counts, to the end', at('round(a, ', 9)?.name === 'round' && at('round(a, ', 9)?.argIndex === 1);
assertCheck('plain brackets are not a call', at('(a + b) * 2', 3) === null);
assertCheck('the call knows where its name starts', at('2 * ceil(x)', 9)?.nameStart === 4);

// The smallest change from one text to another.
assertCheck('an unchanged text is an empty change', (() => {
  const change = minimalChange('a + b', 'a + b');
  return change.from === change.to && change.insert === '';
})());
assertCheck('a rename in the middle changes only the letters that differ', JSON.stringify(minimalChange('x * hoyde + 1', 'x * høyde + 1')) === JSON.stringify({ from: 5, to: 6, insert: 'ø' }));
assertCheck('an insertion at the end is only the added text', JSON.stringify(minimalChange('a + b', 'a + b + c')) === JSON.stringify({ from: 5, to: 5, insert: ' + c' }));
assertCheck('a deletion is a change with nothing inserted', JSON.stringify(minimalChange('a + b + c', 'a + b')) === JSON.stringify({ from: 5, to: 9, insert: '' }));

// How the hosts' problems become underlines.
assertCheck('a syntax message loses the parser\'s character position', plainSyntaxMessage('Value expected (character 7)') === 'Value expected' && plainSyntaxMessage('No position here') === 'No position here');
assertCheck('a syntax problem needs both a range and a message', collectDiagnostics({ syntax: { range: null, message: 'x' } }).length === 0 && collectDiagnostics({ syntax: { range: { start: 1, end: 2 }, message: '' } }).length === 0);
assertCheck('a syntax problem is a broken diagnostic on its range', (() => {
  const [found] = collectDiagnostics({ syntax: { range: { start: 4, end: 5 }, message: 'Value expected (character 5)' } });
  return found.from === 4 && found.to === 5 && found.level === 'broken' && found.message === 'Value expected';
})());
const unknown = (names: string[]) =>
  collectDiagnostics({
    unknownNames: {
      ranges: [{ name: 'a', from: 0, to: 1 }, { name: 'b', from: 4, to: 5 }, { name: 'a', from: 8, to: 9 }],
      names,
      message: (name) => `${name} is unknown`,
      fixes: (name) => [{ label: `Create ${name}`, run: () => undefined }],
    },
  });
assertCheck('every use of a settled unknown name is underlined, with its fixes', (() => {
  const found = unknown(['a']);
  return found.length === 2 && found.every((d) => d.level === 'unresolved' && d.message === 'a is unknown' && d.fixes?.[0].label === 'Create a');
})());
assertCheck('a name not settled as unknown yet is not underlined', unknown([]).length === 0);
assertCheck('problems with their own range are passed on after the rest', (() => {
  const found = collectDiagnostics({
    syntax: { range: { start: 0, end: 1 }, message: 'bad' },
    problems: [{ from: 2, to: 3, level: 'heads-up', message: 'mix' }],
  });
  return found.length === 2 && found[0].level === 'broken' && found[1].level === 'heads-up';
})());

// The shared tokenizer, and what is built on it.
const kinds = (text: string) => tokenize(text).map((token) => `${token.type}:${token.text}`).join(' ');
assertCheck('numbers keep their exponent and names keep their property', kinds('2.5e3 + board.width') === 'number:2.5e3 op:+ name:board.width');
assertCheck('two-character operators, brackets and commas', kinds('a>=b?(c,d):e') === 'name:a op:>= name:b op:? open:( name:c comma:, name:d close:) op:: name:e');
assertCheck('words that are operators stay names; characters it does not know are "other"', kinds('a and "b"') === 'name:a name:and other:" name:b other:"');
assertCheck('Norwegian letters are part of a name', kinds('høyde * åpen') === 'name:høyde op:* name:åpen');
assertCheck('each token knows where it sits', JSON.stringify(tokenize('ab + 1').map((token) => [token.from, token.to])) === JSON.stringify([[0, 2], [3, 4], [5, 6]]));
assertCheck('a number is not read as a call, nor its exponent as a name', parseCalls('1e5(2)').length === 0 && scanExpression('2.5e3 + k').map((token) => token.text).join(',') === 'k');
assertCheck('a call needs a plain name before its bracket', parseCalls('f(a) + board.width(b) + a.b.c(d)').map((call) => call.name).join(',') === 'f');
assertCheck('names are scanned with whether they are called', JSON.stringify(scanExpression('f(x) + y').map((token) => [token.text, token.isCall])) === JSON.stringify([['f', true], ['x', false], ['y', false]]));

// What a step's formula says about itself.
{
  const metres = (key: string) => ({ id: key, key, label: key, widget: 'number', value: { kind: 'number', unitSymbol: 'm' } });
  const calculator = {
    id: 'c', name: 'C', parts: [{ id: 'p', name: 'P' }], layout: [], createdAt: '', updatedAt: '',
    inputs: [metres('bredde'), metres('høyde')],
    steps: [],
  } as unknown as import('../calculator/types').Calculator;
  const library = { materials: [], labor: [], functions: [] };
  const stepOf = (expression: string, extra: Record<string, unknown> = {}) =>
    ({ id: 's', partId: 'p', key: 'sum', label: 'Sum', format: 'number', source: { type: 'expression', expression }, ...extra }) as unknown as import('../calculator/types').CalculatorStep;
  const analyze = (expression: string, result?: Partial<import('../calculator/types').StepResult>, extra: Record<string, unknown> = {}) =>
    analyzeStepFormula({ step: stepOf(expression, extra), result: result as import('../calculator/types').StepResult | undefined, calculator, library });

  assertCheck('a call step reads as its formula', stepExpression({ ...stepOf(''), source: { type: 'expression', expression: 'a + b' } }, library) === 'a + b');
  assertCheck('a sound formula has nothing to say', (() => {
    const found = analyze('bredde * høyde', { status: 'ok', value: 6 });
    return found.issues.length === 0 && found.unknownNames.length === 0 && found.syntaxRange === null && stepDiagnostics(found, library, () => undefined).length === 0;
  })());
  assertCheck('unlike units are a heads-up pinned to the sum, with the operator noted', (() => {
    const found = analyze('bredde * høyde + bredde', { status: 'ok', value: 8 });
    const diagnostics = stepDiagnostics(found, library, () => undefined);
    return found.issues.some((issue) => issue.level === 'heads-up' && /is an area but bredde is a length/.test(issue.message)) &&
      diagnostics.length === 1 && diagnostics[0].level === 'heads-up' && diagnostics[0].from === 0 && diagnostics[0].to === 23 &&
      found.unitAnalysis.notes.some((note) => note.text === 'length × length → area');
  })());
  assertCheck('a result of another kind than the step is set to is a heads-up on the whole formula', (() => {
    const found = analyze('bredde + høyde', { status: 'ok', value: 5 }, { unitSymbol: 'm2', unitCategory: 'area' });
    return found.callProblems.some((problem) => /works out to a length, but the step is set to m² \(area\)/.test(problem.message));
  })());
  assertCheck('a name nothing matches is offered as a new input, with the call parameter it stands for', (() => {
    const created: Array<[string, unknown]> = [];
    const found = analyze('bredde + foo', { status: 'error', message: 'Unknown name "foo"' });
    const diagnostics = stepDiagnostics(found, library, (name, param) => created.push([name, param]));
    diagnostics[0]?.fixes?.[0].run();
    return found.unknownNames.join() === 'foo' && diagnostics.length === 1 && diagnostics[0].level === 'unresolved' && diagnostics[0].from === 9 && diagnostics[0].to === 12 &&
      diagnostics[0].fixes?.[0].label === 'Create input “foo”' && created.length === 1 && created[0][0] === 'foo';
  })());
  assertCheck('a syntax error is underlined where it breaks, in plain words', (() => {
    const found = analyze('bredde +', { status: 'error', message: 'The formula stops too early. A value is missing after the last operator. (character 9)' });
    const diagnostics = stepDiagnostics(found, library, () => undefined);
    return found.syntaxRange !== null && diagnostics.length === 1 && diagnostics[0].level === 'broken' && diagnostics[0].message === 'The formula stops too early. A value is missing after the last operator.';
  })());
}
