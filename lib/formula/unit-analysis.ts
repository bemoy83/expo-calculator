import { parseExpression, type ExprNode } from './expression-tree';
import { getUnit, type UnitCategory } from '../units';

// What a formula's parts are measured in, worked out from the units of the names in it, so a
// mistake like adding a length to an area shows as it's typed, with no values needed. Units are
// carried as powers of length and of weight: a length is L¹, an area L², a volume L³, a weight M¹,
// and counts, percentages and plain numbers are dimensionless. Anything this can't tell (a name
// with no unit, an odd exponent) is unknown, and unknown never raises a problem.

export interface Dim {
  L: number;
  M: number;
}

const NONE: Dim = { L: 0, M: 0 };

export function dimOf(category: UnitCategory | undefined): Dim | null {
  switch (category) {
    case 'length':
      return { L: 1, M: 0 };
    case 'area':
      return { L: 2, M: 0 };
    case 'volume':
      return { L: 3, M: 0 };
    case 'weight':
      return { L: 0, M: 1 };
    case 'count':
    case 'percentage':
      return NONE;
    default:
      return null;
  }
}

/** The category a unit works out to, when it is one the categories can name; undefined for odd ones (per length, length⁴). */
export function categoryOfDim(dim: Dim | null): UnitCategory | undefined {
  if (!dim) return undefined;
  if (dim.L === 0 && dim.M === 0) return 'count';
  if (dim.M === 0 && dim.L >= 1 && dim.L <= 3) return (['length', 'area', 'volume'] as const)[dim.L - 1];
  if (dim.L === 0 && dim.M === 1) return 'weight';
  return undefined;
}

const same = (a: Dim, b: Dim) => a.L === b.L && a.M === b.M;
const isNone = (dim: Dim) => dim.L === 0 && dim.M === 0;
const times = (a: Dim, b: Dim): Dim => ({ L: a.L + b.L, M: a.M + b.M });
const over = (a: Dim, b: Dim): Dim => ({ L: a.L - b.L, M: a.M - b.M });

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const power = (name: string, n: number) => (n === 1 ? name : `${name}${String(n).replace(/./g, (char) => SUPERSCRIPT[char] ?? char)}`);

function positiveName(L: number, M: number): string {
  if (L === 2 && M === 0) return 'area';
  if (L === 3 && M === 0) return 'volume';
  return [L > 0 ? power('length', L) : '', M > 0 ? power('weight', M) : ''].filter(Boolean).join(' · ');
}

/** A unit in words: length, area, volume, weight, "weight per volume", "unitless". */
export function describeDim(dim: Dim): string {
  if (isNone(dim)) return 'unitless';
  const top = positiveName(Math.max(dim.L, 0), Math.max(dim.M, 0));
  const bottom = positiveName(Math.max(-dim.L, 0), Math.max(-dim.M, 0));
  if (!bottom) return top;
  return top ? `${top} per ${bottom}` : `1 per ${bottom}`;
}

/** "a length", "an area". */
export function withArticle(words: string): string {
  return /^[aeiou]/i.test(words) ? `an ${words}` : `a ${words}`;
}

export interface UnitResolver {
  /** What a name (with its `.property`, if any) is measured in; undefined when nothing says. */
  value(base: string, property?: string): UnitCategory | undefined;
  /** What a function the formula calls returns. */
  call(name: string): UnitCategory | undefined;
  /** The unit symbol a name is declared in (m, mm, m²), when there is one */
  symbol?(base: string, property?: string): string | undefined;
}

export interface UnitProblem {
  message: string;
  from: number;
  to: number;
}

export interface UnitNote {
  /** The operator the note is about */
  from: number;
  to: number;
  text: string;
}

export interface UnitAnalysis {
  /** What the whole formula comes to; null when it can't be told */
  result: Dim | null;
  problems: UnitProblem[];
  notes: UnitNote[];
}

const KEEPS_UNIT = new Set(['ceil', 'floor', 'round', 'abs']);
const UNIFIES = new Set(['min', 'max', 'sum']);
const UNITLESS_RESULT = new Set(['sin', 'cos', 'tan', 'log', 'exp', 'count']);
const CONSTANTS = new Set(['pi', 'e']);
const SYMBOL: Record<string, string> = { '*': '×', '/': '÷' };

export function analyzeUnits(text: string, resolver: UnitResolver): UnitAnalysis {
  const analysis: UnitAnalysis = { result: null, problems: [], notes: [] };
  const tree = parseExpression(text);
  if (!tree) return analysis;

  const snippet = (node: ExprNode) => {
    const source = text.slice(node.from, node.to).trim();
    if (source.length <= 24) return source;
    // A long call is named, not cut off in the middle of its arguments.
    return node.type === 'call' ? `${node.name}(…)` : `${source.slice(0, 23)}…`;
  };
  const label = (node: ExprNode, dim: Dim) => (node.type === 'num' ? 'a number' : describeDim(dim));

  // Two unlike measurements put together, as the text says it.
  const mismatch = (verb: string, left: ExprNode, a: Dim, right: ExprNode, b: Dim, from: number, to: number) =>
    analysis.problems.push({
      message: `${snippet(left)} is ${withArticle(describeDim(a))} but ${snippet(right)} is ${withArticle(describeDim(b))}, so ${verb} them is probably a mistake.`,
      from,
      to,
    });

  const walk = (node: ExprNode): Dim | null => {
    switch (node.type) {
      case 'num':
        return NONE;
      case 'name': {
        const known = dimOf(resolver.value(node.base, node.property));
        if (known) return known;
        return !node.property && CONSTANTS.has(node.base) && resolver.value(node.base) === undefined ? NONE : null;
      }
      case 'paren':
        return walk(node.inner);
      case 'un':
        return node.op === 'not' ? (walk(node.arg), NONE) : walk(node.arg);
      case 'cond': {
        walk(node.test);
        const yes = walk(node.yes);
        const no = walk(node.no);
        if (!yes || !no) return null;
        if (same(yes, no)) return yes;
        // A bare 0 or 1 beside a measurement stands for "none", not for a unit of its own.
        if (isNone(yes)) return no;
        if (isNone(no)) return yes;
        return null;
      }
      case 'call': {
        const args = node.args.map(walk);
        if (KEEPS_UNIT.has(node.name)) return args[0] ?? null;
        if (UNITLESS_RESULT.has(node.name)) return NONE;
        if (node.name === 'sqrt') {
          const [arg] = args;
          return arg && arg.L % 2 === 0 && arg.M % 2 === 0 ? { L: arg.L / 2, M: arg.M / 2 } : null;
        }
        if (UNIFIES.has(node.name)) {
          const measured = args
            .map((dim, i) => ({ dim, node: node.args[i] }))
            .filter((entry): entry is { dim: Dim; node: ExprNode } => !!entry.dim && !isNone(entry.dim));
          const first = measured[0];
          for (const other of measured.slice(1)) {
            if (!same(other.dim, first.dim)) mismatch('comparing', first.node, first.dim, other.node, other.dim, node.from, node.to);
          }
          if (args.some((dim) => !dim)) return null;
          return first ? first.dim : NONE;
        }
        return dimOf(resolver.call(node.name));
      }
      case 'bin': {
        const left = walk(node.left);
        const right = walk(node.right);
        const note = (result: Dim | null) => {
          if (left && right && result) {
            const symbol = SYMBOL[node.op] ?? node.op;
            analysis.notes.push({
              from: node.opFrom,
              to: node.opTo,
              text: `${label(node.left, left)} ${symbol} ${label(node.right, right)} → ${describeDim(result)}`,
            });
          }
          return result;
        };
        switch (node.op) {
          case '+':
          case '-': {
            if (!left || !right) return null;
            if (same(left, right)) return note(left);
            // A bare number or a count beside a measurement is neutral, as a fee added to a length.
            if (isNone(left)) return right;
            if (isNone(right)) return left;
            mismatch(node.op === '+' ? 'adding' : 'subtracting', node.left, left, node.right, right, node.from, node.to);
            return null;
          }
          case '*': {
            if (!left || !right) return null;
            const result = times(left, right);
            if (Math.abs(result.L) > 3) {
              analysis.problems.push({
                message: `${snippet(node)} works out to ${describeDim(result)}, which is probably not what you meant.`,
                from: node.from,
                to: node.to,
              });
            }
            return note(result);
          }
          case '/':
            return left && right ? note(over(left, right)) : null;
          case '%':
            return left;
          case '^': {
            // Only a plain whole exponent is followed; anything else could be any unit.
            const exponent = literalValue(node.right, text);
            if (left && isNone(left)) return NONE;
            if (!left || exponent === null || !Number.isInteger(exponent)) return null;
            return note({ L: left.L * exponent, M: left.M * exponent });
          }
          case 'and':
          case 'or':
            return NONE;
          default: {
            // A comparison: always yes or no, but lengths against areas is a mix-up.
            if (left && right && !isNone(left) && !isNone(right) && !same(left, right)) {
              mismatch('comparing', node.left, left, node.right, right, node.from, node.to);
            }
            return NONE;
          }
        }
      }
    }
  };

  analysis.result = walk(tree);
  return analysis;
}

function literalValue(node: ExprNode, text: string): number | null {
  if (node.type === 'paren') return literalValue(node.inner, text);
  if (node.type === 'un' && (node.op === '-' || node.op === '+')) {
    const inner = literalValue(node.arg, text);
    return inner === null ? null : node.op === '-' ? -inner : inner;
  }
  if (node.type !== 'num') return null;
  const value = Number(text.slice(node.from, node.to));
  return Number.isFinite(value) ? value : null;
}

/**
 * The formula as a whole against the unit its step or function is declared in: a problem when it
 * works out to a measurement of another kind. A formula that comes to a plain number is left
 * alone, since a constant in it may carry the unit.
 */
export function declaredUnitProblem(
  text: string,
  analysis: UnitAnalysis,
  declared: { category: UnitCategory | undefined; symbol?: string },
  subject: string
): UnitProblem | null {
  const want = dimOf(declared.category);
  const got = analysis.result;
  if (!want || !got || isNone(got) || same(got, want)) return null;
  const from = text.length - text.trimStart().length;
  const to = text.trimEnd().length;
  const declaredWords = describeDim(want);
  return {
    message: `This works out to ${withArticle(describeDim(got))}, but ${subject} ${declared.symbol ? `${getUnit(declared.symbol)?.symbol ?? declared.symbol} (${declaredWords})` : declaredWords}.`,
    from,
    to,
  };
}

/** What a name is measured in, as one line ("length · m"); undefined when nothing says. */
export function describeNameUnit(resolver: UnitResolver, name: string): string | undefined {
  const [base, property] = name.split('.');
  const category = resolver.value(base, property);
  if (!category) return undefined;
  const words = category === 'count' || category === 'percentage' ? category : describeDim(dimOf(category) ?? NONE);
  const symbol = resolver.symbol?.(base, property);
  return symbol ? `${words} · ${getUnit(symbol)?.symbol ?? symbol}` : words;
}
