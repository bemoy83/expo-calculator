import { isNameChar } from './identifiers';
import { mathInstance } from './math-runtime';

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
      const open = lastUnmatchedOpen(formula);
      if (open === -1) return null;
      let start = open;
      while (start > 0 && isNameChar(formula[start - 1])) start -= 1;
      return { start, end: open + 1 };
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

function lastUnmatchedOpen(formula: string): number {
  const opens: number[] = [];
  for (let i = 0; i < formula.length; i += 1) {
    if (formula[i] === '(') opens.push(i);
    else if (formula[i] === ')') opens.pop();
  }
  return opens.length ? opens[opens.length - 1] : -1;
}
