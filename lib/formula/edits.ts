import { NAME_CHAR } from './identifiers';

// Changes to a formula's text that the editor and its palette make: a name renamed, a token or an
// operator (or a function around the selection) put in, with the spacing a person would give it.

/** The formula with a name replaced wherever it stands alone: not inside a longer name, nor as a `.property`. */
export function renameFormulaName(formula: string, from: string, to: string): string {
  if (!from || from === to) return formula;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^${NAME_CHAR}.])${escaped}(?![${NAME_CHAR}])`, "g");
  return formula.replace(pattern, (_match, before: string) => `${before}${to}`);
}

export function getFormulaWithInsertedToken(input: {
  currentValue: string;
  start: number;
  end: number;
  token: string;
}): { value: string; cursorPosition: number } {
  const before = input.currentValue.substring(0, input.start);
  const after = input.currentValue.substring(input.end);
  const charBefore = input.start > 0 ? input.currentValue[input.start - 1] : "";
  const needsSpaceBefore =
    input.start > 0 && charBefore !== " " && charBefore !== "\t" && !/[+\-*/(]/.test(charBefore);
  const charAfter = input.end < input.currentValue.length ? input.currentValue[input.end] : "";
  const needsSpaceAfter =
    input.end < input.currentValue.length && charAfter !== " " && charAfter !== "\t" && !/[+\-*/)]/.test(charAfter);
  const insertedText = `${needsSpaceBefore ? " " : ""}${input.token}${needsSpaceAfter ? " " : ""}`;

  return {
    value: before + insertedText + after,
    cursorPosition: input.start + insertedText.length,
  };
}


const COMPARISON_OPERATORS = ["==", "!=", ">=", "<=", ">", "<"];

export function getFormulaWithInsertedOperator(input: {
  currentValue: string;
  start: number;
  end: number;
  operator: string;
}): { value: string; cursorPosition: number } {
  const before = input.currentValue.substring(0, input.start);
  const after = input.currentValue.substring(input.end);
  const charBefore = input.start > 0 ? input.currentValue[input.start - 1] : "";
  // Operators get a space on each side, so the next value can be typed straight after.
  const needsSpaceBefore = input.start > 0 && !/\s/.test(charBefore) && charBefore !== "(";
  const charAfter = input.end < input.currentValue.length ? input.currentValue[input.end] : "";
  const needsSpaceAfter = !/\s/.test(charAfter);
  const spaceBefore = needsSpaceBefore ? " " : "";

  const selectedText = input.currentValue.substring(input.start, input.end);

  // A comparison with something selected wraps it as a yes/no condition, `(sel == )`, and the
  // cursor goes before ")" to type what it's compared with.
  if (selectedText && COMPARISON_OPERATORS.includes(input.operator)) {
    const insertedText = `${spaceBefore}(${selectedText} ${input.operator} )`;
    return { value: before + insertedText + after, cursorPosition: input.start + insertedText.length - 1 };
  }

  // A function or brackets: what's selected goes inside, as the first argument, and the cursor
  // goes where the next thing is typed: inside the brackets, or before the ")" of round(x, ).
  const open = input.operator.indexOf("(");
  if (open !== -1) {
    const selected = input.currentValue.substring(input.start, input.end);
    const inside = input.operator.slice(0, open + 1) + selected;
    const rest = input.operator.slice(open + 1);
    const insertedText = `${spaceBefore}${inside}${rest}`;
    const cursorInRest = !selected ? 0 : rest.startsWith(")") ? rest.length : rest.indexOf(")");
    return {
      value: before + insertedText + after,
      cursorPosition: input.start + spaceBefore.length + inside.length + cursorInRest,
    };
  }

  const insertedText = `${spaceBefore}${input.operator}${needsSpaceAfter ? " " : ""}`;

  return {
    value: before + insertedText + after,
    cursorPosition: input.start + insertedText.length,
  };
}
