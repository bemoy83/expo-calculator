import { mathInstance } from './math-runtime';
import { tokenize, type Token } from './tokens';

// Tidies a formula's spacing: one space around operators, ", " between arguments, nothing
// inside brackets or between a function name and its "(", and no space after a leading or
// unary minus. Only spacing changes. A formula that doesn't parse, or that would read
// differently afterwards, comes back as written.


function respace(tokens: Token[]): string {
  let out = '';
  // Whether the last operator was unary (a leading or sign minus), which takes no space after.
  let previous: (Token & { unary?: boolean }) | undefined;
  for (const token of tokens) {
    const afterValue = previous?.type === 'number' || previous?.type === 'name' || previous?.type === 'close';
    switch (token.type) {
      case 'op': {
        const unary = (token.text === '-' || token.text === '+') && !afterValue;
        if (unary) {
          out += token.text;
        } else {
          out = `${out.trimEnd()} ${token.text} `;
        }
        previous = { ...token, unary };
        continue;
      }
      case 'open':
        out += token.text;
        break;
      case 'close':
        out = out.trimEnd() + token.text;
        break;
      case 'comma':
        out = `${out.trimEnd()}, `;
        break;
      case 'number':
      case 'name':
        // Two values in a row (implicit multiplication, or words like "and") keep a space.
        out += afterValue ? ` ${token.text}` : token.text;
        break;
      default:
        out += token.text;
    }
    previous = token;
  }
  return out.trim();
}

function readsAs(formula: string): string | undefined {
  try {
    return mathInstance.parse(formula).toString();
  } catch {
    return undefined;
  }
}

export function prettifyFormula(formula: string): string {
  const before = readsAs(formula);
  if (before === undefined) return formula;
  const tidied = respace(tokenize(formula));
  return readsAs(tidied) === before ? tidied : formula;
}

/**
 * Where a caret at `caret` in `before` belongs in `after`, when the two differ only in
 * whitespace (as a tidied formula does): after the same number of non-space characters.
 */
export function caretAfterTidy(before: string, caret: number, after: string): number {
  const count = before.slice(0, caret).replace(/\s/g, '').length;
  let seen = 0;
  for (let i = 0; i < after.length; i += 1) {
    if (seen === count) return i;
    if (!/\s/.test(after[i])) seen += 1;
  }
  return after.length;
}
