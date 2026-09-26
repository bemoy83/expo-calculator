import { NAME_WITH_PROPERTY } from './identifiers';
import { mathInstance } from './math-runtime';

// Tidies a formula's spacing: one space around operators, ", " between arguments, nothing
// inside brackets or between a function name and its "(", and no space after a leading or
// unary minus. Only spacing changes. A formula that doesn't parse, or that would read
// differently afterwards, comes back as written.

type TokenType = 'number' | 'name' | 'operator' | 'open' | 'close' | 'comma' | 'other';
interface Token {
  type: TokenType;
  text: string;
}

const NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const NAME = new RegExp(NAME_WITH_PROPERTY, 'y');
const TWO_CHAR_OPERATORS = ['==', '!=', '>=', '<='];
const OPERATORS = new Set(['+', '-', '*', '/', '^', '%', '<', '>', '=', '?', ':']);

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const char = formula[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    const readSticky = (regex: RegExp) => {
      regex.lastIndex = i;
      return regex.exec(formula)?.[0];
    };
    const number = /[\d.]/.test(char) ? readSticky(NUMBER) : undefined;
    const name = number ? undefined : readSticky(NAME);
    const twoChar = formula.slice(i, i + 2);
    let token: Token;
    if (number) token = { type: 'number', text: number };
    else if (name) token = { type: 'name', text: name };
    else if (TWO_CHAR_OPERATORS.includes(twoChar)) token = { type: 'operator', text: twoChar };
    else if (OPERATORS.has(char)) token = { type: 'operator', text: char };
    else if (char === '(') token = { type: 'open', text: char };
    else if (char === ')') token = { type: 'close', text: char };
    else if (char === ',') token = { type: 'comma', text: char };
    else token = { type: 'other', text: char };
    tokens.push(token);
    i += token.text.length;
  }
  return tokens;
}

function respace(tokens: Token[]): string {
  let out = '';
  // Whether the last operator was unary (a leading or sign minus), which takes no space after.
  let previous: (Token & { unary?: boolean }) | undefined;
  for (const token of tokens) {
    const afterValue = previous?.type === 'number' || previous?.type === 'name' || previous?.type === 'close';
    switch (token.type) {
      case 'operator': {
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
 * Tidies a formula box a moment after it loses focus, unless focus came back (an operator
 * button or a suggestion puts it back after inserting), so the text never shifts under a click.
 */
export function tidyFormulaAfterBlur(
  textarea: HTMLTextAreaElement | null,
  apply: (formula: string) => void,
  when: () => boolean = () => true
) {
  setTimeout(() => {
    if (!textarea || document.activeElement === textarea || !when()) return;
    const tidied = prettifyFormula(textarea.value);
    if (tidied !== textarea.value) apply(tidied);
  }, 300);
}
