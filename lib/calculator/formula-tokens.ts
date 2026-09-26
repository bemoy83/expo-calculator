import { MATH_FUNCTIONS } from '../formula/parser';
import type { SharedFunction } from '../types';
import { scanExpression } from './dependencies';
import type { Calculator, CalculatorLibrary } from './types';

// A formula split into pieces by what each name is, so it can be coloured: an input (or a
// function's parameter), the result of another step, a function, a material or labor
// property, a name nothing matches, or plain text (numbers, operators, spaces).

export type FormulaTokenKind = 'input' | 'result' | 'function' | 'property' | 'unknown' | 'plain';

export interface FormulaSegment {
  text: string;
  kind: FormulaTokenKind;
}

export interface FormulaNames {
  /** Calculator inputs, or a function's parameters. */
  inputs: Set<string>;
  /** Other steps' names. */
  results: Set<string>;
  functions: Set<string>;
  /** Material and labor variable names, which formulas may name directly. */
  catalog: Set<string>;
}

// sum/min/max/count combine values; they read as functions like round and ceil.
const BUILT_IN_CALLS = new Set([...MATH_FUNCTIONS, 'sum', 'count']);
const CONSTANTS = new Set(['pi', 'e']);

export function classifyFormula(expression: string, names: FormulaNames): FormulaSegment[] {
  const segments: FormulaSegment[] = [];
  let last = 0;
  const plain = (text: string) => {
    if (text) segments.push({ text, kind: 'plain' });
  };
  for (const token of scanExpression(expression)) {
    plain(expression.slice(last, token.start));
    let kind: FormulaTokenKind;
    if (token.isCall) {
      kind = names.functions.has(token.base) || BUILT_IN_CALLS.has(token.base) ? 'function' : 'unknown';
    } else if (token.property !== undefined) {
      kind = names.inputs.has(token.base) || names.catalog.has(token.base) ? 'property' : 'unknown';
    } else if (names.results.has(token.base)) kind = 'result';
    else if (names.inputs.has(token.base)) kind = 'input';
    else if (names.catalog.has(token.base)) kind = 'property';
    else if (CONSTANTS.has(token.base)) kind = 'plain';
    else kind = 'unknown';
    segments.push({ text: token.text, kind });
    last = token.end;
  }
  plain(expression.slice(last));
  return segments;
}

function catalogNames(library: Pick<CalculatorLibrary, 'materials' | 'labor'>): Set<string> {
  return new Set([...library.materials, ...library.labor].map((item) => item.variableName));
}

/** The names a calculator's step formulas can use. */
export function calculatorFormulaNames(calculator: Calculator, library: CalculatorLibrary): FormulaNames {
  return {
    inputs: new Set(calculator.inputs.map((input) => input.key)),
    results: new Set(calculator.steps.map((step) => step.key)),
    functions: new Set(library.functions.map((fn) => fn.name)),
    catalog: catalogNames(library),
  };
}

/** The names a function's formula can use: its parameters and the other functions. */
export function functionFormulaNames(
  fn: Pick<SharedFunction, 'parameters'>,
  library: Pick<CalculatorLibrary, 'functions' | 'materials' | 'labor'>
): FormulaNames {
  return {
    inputs: new Set(fn.parameters.map((param) => param.name).filter(Boolean)),
    results: new Set(),
    functions: new Set(library.functions.map((candidate) => candidate.name)),
    catalog: catalogNames(library),
  };
}
