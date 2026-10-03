import { callAtCaret } from '../calculator/call-context';
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
