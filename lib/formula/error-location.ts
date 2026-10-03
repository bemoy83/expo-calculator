import { friendlyEvaluationMessage } from './error-messages';
import { isNameChar } from './identifiers';
import { mathInstance } from './math-runtime';
import { tokenize, type Token } from './tokens';

/** The part of a formula a syntax error points at: [start, end) in the formula as written. */
export interface FormulaErrorRange {
  start: number;
  end: number;
}

// Where a formula's syntax breaks, for underlining it. The parser reports a 1-based "(char N)"
// into the text it was given, so it's asked about the formula as written (names and all): the
// validator's own message counts in a copy with every name swapped for "1", which doesn't line up.
// Returns null for a formula that parses, or whose error has no position.
export function findFormulaErrorRange(formula: string): FormulaErrorRange | null {
  try {
    mathInstance.parse(formula);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const position = message.match(/\(char (\d+)\)/);
    if (!position) return null;

    // A bracket that's never closed: the unmatched "(" and the function name in front of it.
    if (/^Parenthesis \) expected/.test(message)) {
      const tokens = tokenize(formula);
      const open = lastUnmatchedOpen(tokens);
      if (open === -1) return null;
      // Only a name right against the bracket belongs to it, and for `board.width(` only the part after the dot.
      const before = tokens[open - 1];
      const start = before?.type === 'name' && before.to === tokens[open].from ? before.from + before.text.lastIndexOf('.') + 1 : tokens[open].from;
      return { start, end: tokens[open].to };
    }

    const lastUsed = formula.search(/\S\s*$/);
    if (lastUsed === -1) return null;
    let index = parseInt(position[1], 10) - 1;
    // Past the end ("stops too early"): the last thing written, usually the trailing operator.
    if (index >= formula.length) return { start: lastUsed, end: lastUsed + 1 };
    // On a space: the next thing that isn't one.
    while (index < formula.length && /\s/.test(formula[index])) index += 1;
    if (index >= formula.length) return { start: lastUsed, end: lastUsed + 1 };

    let end = index + 1;
    if (isNameChar(formula[index]) || formula[index] === '.') {
      while (end < formula.length && (isNameChar(formula[end]) || formula[end] === '.')) end += 1;
    }
    return { start: index, end };
  }
}

/** Index (into the tokens) of the last "(" that is never closed, or -1. */
function lastUnmatchedOpen(tokens: Token[]): number {
  const opens: number[] = [];
  tokens.forEach((token, index) => {
    if (token.type === 'open') opens.push(index);
    else if (token.type === 'close') opens.pop();
  });
  return opens.length ? opens[opens.length - 1] : -1;
}

/**
 * The formula's syntax problem in plain words, or null if it reads fine. The validator stops at
 * the first problem it meets, so a formula that is both unresolved (a name that doesn't exist)
 * and unfinished (`hoyd * 2 +`) only ever reports the name; this finds the other one.
 */
export function findSyntaxProblem(formula: string): string | null {
  if (!formula.trim()) return null;
  try {
    mathInstance.parse(formula);
    return null;
  } catch (error) {
    // The underline shows where, so the character count is left out.
    return friendlyEvaluationMessage(error instanceof Error ? error.message : 'Invalid formula').replace(/\s*\(character \d+\)$/, '');
  }
}
