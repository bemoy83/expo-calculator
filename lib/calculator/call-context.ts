import { isValidName, NAME } from '../formula/identifiers';
import { tokenize } from '../formula/tokens';
import { getFunctionParamKinds } from '../functions/param-kinds';
import type { FunctionParamKind } from '../types';
import type { UnitCategory } from '../units';
import { declaredCategory, declaredUnit } from '../formula/unit-resolvers';
import type { Calculator, CalculatorLibrary, CalculatorStep, InputValueSpec } from './types';

// What a step's formula says about the function calls in it, for the hints under the editor:
// which call the cursor is in and which argument, what each parameter expects, what a plain
// name passed for it is, and what looks wrong. Pure text analysis, no evaluation.

export interface CallArg {
  /** The argument as written, trimmed. Empty for `f()` or `f(a, )`. */
  text: string;
  /** Where the trimmed text sits in the formula. An empty argument is a point (start = end). */
  start: number;
  end: number;
}

export interface CallFrame {
  name: string;
  /** Index of the name's first character. */
  nameStart: number;
  /** Index of "(". */
  open: number;
  /** Index of ")"; undefined while the call is still being typed. */
  close?: number;
  args: CallArg[];
}

interface OpenFrame {
  name: string;
  nameStart: number;
  open: number;
  commas: number[];
}

function buildArgs(expression: string, frame: OpenFrame, end: number): CallArg[] {
  const bounds = [frame.open, ...frame.commas, end];
  const args: CallArg[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const from = bounds[i] + 1;
    const to = bounds[i + 1];
    const raw = expression.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const text = raw.trim();
    const start = from + (text ? lead : raw.length);
    args.push({ text, start, end: start + text.length });
  }
  return args;
}

/**
 * Every call in the formula, in the order they open, nested ones included, math functions
 * (ceil, round, min…) too. Parentheses that only group (`(a + b) * 2`) aren't calls.
 * A call with no closing ")" runs to the end of the formula.
 */
export function parseCalls(expression: string): CallFrame[] {
  const calls: CallFrame[] = [];
  const stack: Array<OpenFrame | null> = [];
  const place = new Map<OpenFrame, number>();

  const finish = (frame: OpenFrame, close: number | undefined) => {
    const call: CallFrame = {
      name: frame.name,
      nameStart: frame.nameStart,
      open: frame.open,
      close,
      args: buildArgs(expression, frame, close ?? expression.length),
    };
    calls[place.get(frame)!] = call;
  };

  const tokens = tokenize(expression);
  tokens.forEach((token, index) => {
    if (token.type === 'open') {
      // A name right before the bracket makes it a call; `board.width(` and `a.b.c(` aren't.
      const before = tokens[index - 1];
      if (before?.type === 'name' && !before.text.includes('.') && expression[before.from - 1] !== '.' && isValidName(before.text)) {
        const frame: OpenFrame = { name: before.text, nameStart: before.from, open: token.from, commas: [] };
        place.set(frame, calls.length);
        calls.push(undefined as unknown as CallFrame);
        stack.push(frame);
      } else {
        stack.push(null);
      }
    } else if (token.type === 'comma') {
      const top = stack[stack.length - 1];
      if (top) top.commas.push(token.from);
    } else if (token.type === 'close') {
      const top = stack.pop();
      if (top) finish(top, token.from);
    }
  });
  for (const frame of stack) if (frame) finish(frame, undefined);
  return calls;
}

/** The innermost call the caret is inside, and the argument it's on. */
export function callAtCaret(doc: string, caret: number) {
  let found: { name: string; nameStart: number; argIndex: number } | null = null;
  let openAt = -1;
  for (const call of parseCalls(doc)) {
    if (caret <= call.open || (call.close !== undefined && caret > call.close) || call.open < openAt) continue;
    openAt = call.open;
    const next = call.args.findIndex((arg) => caret <= arg.end);
    found = { name: call.name, nameStart: call.nameStart, argIndex: next === -1 ? call.args.length - 1 : next };
  }
  return found;
}

// ---- What a call expects ----

export interface ParamSpec {
  name: string;
  label: string;
  kind: FunctionParamKind;
  unitSymbol?: string;
  unitCategory?: UnitCategory;
}

export interface CallSignature {
  name: string;
  description?: string;
  category?: string;
  params: ParamSpec[];
  /** The last parameter repeats (min, max): argument count isn't checked. */
  variadic?: boolean;
  builtIn?: boolean;
}

const number = (name: string, label: string): ParamSpec => ({ name, label, kind: 'number' });

const BUILT_INS: CallSignature[] = [
  { name: 'ceil', description: 'Round up', params: [number('x', 'Value')] },
  { name: 'floor', description: 'Round down', params: [number('x', 'Value')] },
  {
    name: 'round',
    description: 'Round; round(x, 2) to 2 decimals',
    params: [number('x', 'Value'), number('decimals', 'Decimals')],
    variadic: true,
  },
  { name: 'min', description: 'Smallest value', params: [number('values', 'Values')], variadic: true },
  { name: 'max', description: 'Largest value', params: [number('values', 'Values')], variadic: true },
  { name: 'abs', description: 'Absolute value', params: [number('x', 'Value')] },
  { name: 'sqrt', description: 'Square root', params: [number('x', 'Value')] },
].map((signature) => ({ ...signature, builtIn: true as const }));

/** What a called name takes: a shared function's parameters, or a built-in's; undefined if unknown. */
export function callSignature(name: string, library: Pick<CalculatorLibrary, 'functions'>): CallSignature | undefined {
  const fn = library.functions.find((candidate) => candidate.name === name);
  if (fn) {
    const kinds = getFunctionParamKinds(fn);
    return {
      name: fn.name,
      description: fn.description,
      category: fn.category,
      params: fn.parameters.map((param) => ({
        name: param.name,
        label: param.label || param.name,
        kind: kinds[param.name] ?? 'number',
        unitSymbol: param.unitSymbol,
        unitCategory: declaredCategory(param),
      })),
    };
  }
  return BUILT_INS.find((signature) => signature.name === name);
}

/** The parameter an argument position fills; a variadic call's last parameter takes the rest. */
export function paramAt(signature: CallSignature, argIndex: number): ParamSpec | undefined {
  if (argIndex < signature.params.length) return signature.params[argIndex];
  return signature.variadic ? signature.params[signature.params.length - 1] : undefined;
}

// ---- What a plain name is ----

export interface ArgInfo {
  kind: FunctionParamKind;
  unitCategory?: UnitCategory;
  source: 'input' | 'result' | 'property' | 'number';
  label: string;
  /** The step, when the argument is a result. */
  step?: CalculatorStep;
}

function specKind(value: InputValueSpec): FunctionParamKind | undefined {
  switch (value.kind) {
    case 'number':
    case 'choice':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'material':
    case 'labor':
      return value.kind;
    default:
      return undefined;
  }
}

/**
 * What an argument is when it's a single name, `input.property`, or a number; undefined for
 * anything else (arithmetic, nested calls, unknown names), which isn't guessed at.
 */
function describeArg(text: string, calculator: Calculator): ArgInfo | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (Number.isFinite(Number(trimmed))) return { kind: 'number', source: 'number', label: trimmed };
  const property = trimmed.match(new RegExp(`^(${NAME})\\.(${NAME})$`));
  if (property) {
    const input = calculator.inputs.find((candidate) => candidate.key === property[1]);
    if (input && (input.value.kind === 'material' || input.value.kind === 'labor')) {
      return { kind: 'number', source: 'property', label: `${input.label} → ${property[2]}` };
    }
    return undefined;
  }
  if (!isValidName(trimmed)) return undefined;
  const input = calculator.inputs.find((candidate) => candidate.key === trimmed);
  if (input) {
    const kind = specKind(input.value);
    return kind ? { kind, unitCategory: declaredUnit(calculator, trimmed).category, source: 'input', label: input.label } : undefined;
  }
  const step = calculator.steps.find((candidate) => candidate.key === trimmed);
  if (step) {
    return {
      kind: 'number',
      unitCategory: declaredUnit(calculator, trimmed).category,
      source: 'result',
      label: step.label || step.key,
      step,
    };
  }
  return undefined;
}

// ---- What looks wrong ----

export interface CallProblem {
  message: string;
  /** "arguments": the call has the wrong number of them, so it can't run; "mismatch": an argument is the wrong kind or unit */
  kind: 'arguments' | 'mismatch';
  /** The text it's about (an argument, or the whole call's parentheses). */
  start: number;
  end: number;
}

function kindWord(kind: FunctionParamKind): string {
  return kind === 'boolean' ? 'yes/no value' : kind;
}

/**
 * Mistakes in how functions are called, whatever the values: the wrong number of arguments,
 * a material where a number goes (or the reverse), a length where an area goes. Calls with
 * an unknown name, and arguments that aren't a plain name or number, are left alone.
 */
export function findCallProblems(expression: string, calculator: Calculator, library: Pick<CalculatorLibrary, 'functions'>): CallProblem[] {
  const problems: CallProblem[] = [];
  for (const call of parseCalls(expression)) {
    const signature = callSignature(call.name, library);
    if (!signature || call.close === undefined) continue;
    const args = call.args.length === 1 && call.args[0].text === '' ? [] : call.args;
    if (!signature.variadic && args.length !== signature.params.length) {
      const expected = signature.params.length;
      problems.push({
        message: `${call.name} takes ${expected} ${expected === 1 ? 'argument' : 'arguments'}; here it has ${args.length}.`,
        kind: 'arguments',
        start: call.nameStart,
        end: call.close + 1,
      });
      continue;
    }
    args.forEach((arg, index) => {
      const param = paramAt(signature, index);
      const info = param && describeArg(arg.text, calculator);
      if (!param || !info) return;
      if (info.kind !== param.kind) {
        problems.push({
          message: `${param.label} expects a ${kindWord(param.kind)}; ${arg.text} is a ${kindWord(info.kind)}.`,
          kind: 'mismatch',
          start: arg.start,
          end: arg.end,
        });
      } else if (param.unitCategory && info.unitCategory && param.unitCategory !== info.unitCategory) {
        problems.push({
          message: `${param.label} expects a ${param.unitCategory}; ${arg.text} is a ${info.unitCategory}.`,
          kind: 'mismatch',
          start: arg.start,
          end: arg.end,
        });
      }
    });
  }
  return problems;
}

/** The parameter of a shared function that `name` is passed as, to shape an input made for it. */
export function parameterFor(expression: string, name: string, library: Pick<CalculatorLibrary, 'functions'>): ParamSpec | undefined {
  for (const call of parseCalls(expression)) {
    const signature = callSignature(call.name, library);
    if (!signature || signature.builtIn) continue;
    const index = call.args.findIndex((arg) => arg.text === name);
    const param = index >= 0 ? paramAt(signature, index) : undefined;
    if (param) return param;
  }
  return undefined;
}

// ---- Catalog properties ----

/** Distinct property names of the materials or labor an input can pick, sorted. */
export function propertyNamesFor(input: Calculator['inputs'][number], library: Pick<CalculatorLibrary, 'materials' | 'labor'>): string[] {
  if (input.value.kind !== 'material' && input.value.kind !== 'labor') return [];
  const category = input.value.category;
  const items: Array<{ category: string; properties?: Array<{ name: string }> }> =
    input.value.kind === 'material' ? library.materials : library.labor;
  const names = new Set<string>();
  items
    .filter((item) => !category || item.category === category)
    .forEach((item) => item.properties?.forEach((property) => names.add(property.name)));
  return [...names].sort();
}
