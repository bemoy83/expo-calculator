import { callAtCaret } from '../calculator/call-context';
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
