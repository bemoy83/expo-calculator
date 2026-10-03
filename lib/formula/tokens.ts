import { NAME_WITH_PROPERTY } from './identifiers';

// The one reading of a formula's text into tokens, with where each sits. Everything that needs the
// pieces of a formula (colouring its names, tidying its spacing, finding its calls and their
// arguments, the unit analysis, the dependencies between steps) starts here, so they all agree on
// what is a number, a name, an operator or a bracket. It never fails: a character it doesn't know
// comes back as an 'other' token, and each reader decides what that means.

export type TokenType = 'number' | 'name' | 'op' | 'open' | 'close' | 'comma' | 'other';

export interface Token {
  type: TokenType;
  text: string;
  /** Index of the first character, and one past the last */
  from: number;
  to: number;
}

// A number, with its exponent (1e5, 2.5e3), so the "e" is never read as a name.
const NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
// A name with an optional `.property`; æ, ø and å count as letters.
const NAME = new RegExp(NAME_WITH_PROPERTY, 'y');
const TWO_CHAR_OPERATORS = ['==', '!=', '>=', '<='];
const OPERATORS = new Set(['+', '-', '*', '/', '^', '%', '<', '>', '=', '?', ':']);

/** Words that are operators when they stand alone: and, or, not. They come back as names. */
export const WORD_OPERATORS = new Set(['and', 'or', 'not']);

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    const sticky = (regex: RegExp) => {
      regex.lastIndex = i;
      return regex.exec(text)?.[0];
    };
    const number = /[\d.]/.test(char) ? sticky(NUMBER) : undefined;
    const name = number ? undefined : sticky(NAME);
    const two = text.slice(i, i + 2);
    let type: TokenType;
    let value: string;
    if (number) [type, value] = ['number', number];
    else if (name) [type, value] = ['name', name];
    else if (TWO_CHAR_OPERATORS.includes(two)) [type, value] = ['op', two];
    else if (OPERATORS.has(char)) [type, value] = ['op', char];
    else if (char === '(') [type, value] = ['open', char];
    else if (char === ')') [type, value] = ['close', char];
    else if (char === ',') [type, value] = ['comma', char];
    else [type, value] = ['other', char];
    tokens.push({ type, text: value, from: i, to: i + value.length });
    i += value.length;
  }
  return tokens;
}
