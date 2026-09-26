// What a name in a formula may look like: letters (Norwegian æ, ø and å included), digits and
// _, not starting with a digit. mathjs reads these letters as part of a name too.
//
// Regex `\b` treats æ, ø and å as separators, so `\bhøyde\b` would split the name; the
// helpers below stand in for it. They avoid lookbehind, which older Safari can't parse.

export const NAME_START = 'A-Za-z_ÆØÅæøå';
export const NAME_CHAR = 'A-Za-z0-9_ÆØÅæøå';

/** A name, as a pattern source. */
export const NAME = `[${NAME_START}][${NAME_CHAR}]*`;
/** A name with an optional `.property`, as a pattern source. */
export const NAME_WITH_PROPERTY = `${NAME}(?:\\.${NAME})?`;

const VALID_NAME = new RegExp(`^${NAME}$`);

export function isValidName(text: string): boolean {
  return VALID_NAME.test(text);
}

/** Whether `char` can continue a name. */
export function isNameChar(char: string | undefined): boolean {
  return !!char && new RegExp(`[${NAME_CHAR}]`).test(char);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * `body` not preceded by a name character, and unless `openEnd`, not followed by one either
 * (for a body ending in something else, like the "(" of a call); group 1 is the character before.
 */
function standalone(body: string, openEnd = false): RegExp {
  return new RegExp(`(^|[^${NAME_CHAR}])(${body})${openEnd ? '' : `(?![${NAME_CHAR}])`}`, 'g');
}

export interface StandaloneMatch {
  text: string;
  /** The body's own capture groups. */
  groups: string[];
  index: number;
}

/** Every standalone match of the pattern source `body`, left to right. */
export function matchStandalone(text: string, body: string, options: { openEnd?: boolean } = {}): StandaloneMatch[] {
  const regex = standalone(body, options.openEnd);
  const matches: StandaloneMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const index = match.index + match[1].length;
    const end = index + match[2].length;
    matches.push({ text: match[2], groups: match.slice(3), index });
    // Resume on the match's last character: it may be what the next match needs before it,
    // as the "(" of `f(` is for `g` in `f(g(x))`.
    regex.lastIndex = end - 1 > match.index ? end - 1 : Math.max(end, match.index + 1);
  }
  return matches;
}

/** The text of every standalone match of the pattern source `body`. */
export function findStandalone(text: string, body: string): string[] {
  return matchStandalone(text, body).map((match) => match.text);
}

/** Whether `literal` (e.g. a name or `board.width`) appears on its own in `text`. */
export function containsStandalone(text: string, literal: string): boolean {
  return matchStandalone(text, escapeRegex(literal)).length > 0;
}

/** Replaces every standalone `literal` in `text`. */
export function replaceStandalone(text: string, literal: string, replacement: string): string {
  return text.replace(standalone(escapeRegex(literal)), (_whole, before: string) => before + replacement);
}
