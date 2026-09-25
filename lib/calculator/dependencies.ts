import { MATH_FUNCTIONS } from '../formula/parser';
import { getFunctionParamKinds } from '../functions/param-kinds';
import type { SharedFunction } from '../types';
import type { Calculator, CalculatorStep, Condition, InputKind } from './types';

export interface ExpressionToken {
  text: string;
  base: string;
  property?: string;
  start: number;
  end: number;
  /** Followed by "(": a function name, not a value. */
  isCall: boolean;
}

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?/g;

// Identifiers in an expression with their positions. Skips the letters of a number such as
// 1e5 or 2.5e3, which the pattern would otherwise read as a name.
export function scanExpression(expression: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  IDENTIFIER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IDENTIFIER.exec(expression)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const previous = expression[start - 1];
    if (previous !== undefined && /[0-9.]/.test(previous)) continue;
    const [base, property] = match[0].split('.');
    tokens.push({
      text: match[0],
      base,
      property,
      start,
      end,
      isCall: !property && /^\s*\(/.test(expression.slice(end)),
    });
  }
  return tokens;
}

/** Replaces identifiers for which `replace` returns a string; keeps the rest as written. */
export function rewriteExpression(
  expression: string,
  replace: (token: ExpressionToken) => string | null
): string {
  let result = '';
  let last = 0;
  for (const token of scanExpression(expression)) {
    const replacement = replace(token);
    if (replacement === null) continue;
    result += expression.slice(last, token.start) + replacement;
    last = token.end;
  }
  return result + expression.slice(last);
}

export interface StepDependencies {
  inputs: string[];
  steps: string[];
  /** Reasons the step can't calculate regardless of values (unknown names, unbound parameters). */
  errors: string[];
}

export interface DependencyScope {
  inputKinds: Map<string, InputKind>;
  stepKeys: Set<string>;
  functions: Map<string, SharedFunction>;
  /** Material and labor variable names, which expressions may reference directly. */
  catalogNames: Set<string>;
}

export function createDependencyScope(
  calculator: Calculator,
  library: { functions: SharedFunction[]; materials: { variableName: string }[]; labor: { variableName: string }[] }
): DependencyScope {
  return {
    inputKinds: new Map(calculator.inputs.map((input) => [input.key, input.value.kind])),
    stepKeys: new Set(calculator.steps.map((step) => step.key)),
    functions: new Map(library.functions.map((fn) => [fn.name, fn])),
    catalogNames: new Set([...library.materials, ...library.labor].map((item) => item.variableName)),
  };
}

function isPickerKind(kind: InputKind | undefined) {
  return kind === 'material' || kind === 'labor';
}

export function getConditionInputs(condition: Condition | undefined): string[] {
  return condition ? [condition.inputKey] : [];
}

// What a step reads, and what makes it unable to calculate whatever the values are.
export function getStepDependencies(step: CalculatorStep, scope: DependencyScope): StepDependencies {
  const inputs = new Set<string>(getConditionInputs(step.enabledWhen));
  const steps = new Set<string>();
  const errors: string[] = [];

  const readInput = (key: string) => {
    if (scope.inputKinds.get(key) === 'text') {
      errors.push(`"${key}" is a text note and can't be used in a calculation.`);
      return;
    }
    inputs.add(key);
  };

  for (const key of getConditionInputs(step.enabledWhen)) {
    if (!scope.inputKinds.has(key)) errors.push(`The condition uses "${key}", which isn't an input.`);
  }

  if (step.source.type === 'call') {
    const fn = scope.functions.get(step.source.functionName);
    if (!step.source.functionName) {
      errors.push('Choose a function.');
    } else if (!fn) {
      errors.push(`Function "${step.source.functionName}" doesn't exist.`);
    } else {
      const kinds = getFunctionParamKinds(fn);
      for (const param of fn.parameters) {
        const binding = step.source.args[param.name];
        const paramLabel = param.label || param.name;
        if (!binding) {
          errors.push(`Choose a value for ${paramLabel}.`);
          continue;
        }
        // A material or labor parameter needs a pick of that kind; anything else can't have
        // properties read from it.
        const kind = kinds[param.name];
        if (kind === 'material' || kind === 'labor') {
          const bound = binding.type === 'input' ? scope.inputKinds.get(binding.key) : undefined;
          if (bound !== kind) {
            errors.push(`${paramLabel} needs a ${kind === 'material' ? 'material' : 'labor'} input.`);
            continue;
          }
        }
        if (binding.type === 'input') {
          if (!scope.inputKinds.has(binding.key)) errors.push(`${paramLabel} uses "${binding.key}", which isn't an input.`);
          else readInput(binding.key);
        } else if (binding.type === 'step') {
          if (!scope.stepKeys.has(binding.key)) errors.push(`${paramLabel} uses "${binding.key}", which isn't a step.`);
          else steps.add(binding.key);
        } else if (binding.type === 'property') {
          if (!isPickerKind(scope.inputKinds.get(binding.inputKey))) {
            errors.push(`${paramLabel} reads a property of "${binding.inputKey}", which isn't a material or labor input.`);
          } else {
            inputs.add(binding.inputKey);
          }
        }
      }
    }
    return { inputs: [...inputs], steps: [...steps], errors };
  }

  const expression = step.source.expression;
  if (!expression.trim()) {
    errors.push('Add a formula for this step.');
  }
  for (const token of scanExpression(expression)) {
    if (token.isCall) {
      if (!MATH_FUNCTIONS.has(token.base) && !scope.functions.has(token.base)) {
        errors.push(`Function "${token.base}" doesn't exist.`);
      }
      continue;
    }
    if (token.property !== undefined) {
      if (token.base === 'out') {
        errors.push(`"${token.text}" refers to a module output; use "${token.property}" instead.`);
      } else if (scope.inputKinds.has(token.base)) {
        if (isPickerKind(scope.inputKinds.get(token.base))) inputs.add(token.base);
        else errors.push(`"${token.text}": only material and labor inputs have properties.`);
      } else if (!scope.catalogNames.has(token.base)) {
        errors.push(`Unknown name "${token.base}".`);
      }
      continue;
    }
    if (scope.inputKinds.has(token.base)) readInput(token.base);
    else if (scope.stepKeys.has(token.base)) steps.add(token.base);
    else if (!MATH_FUNCTIONS.has(token.base) && !scope.catalogNames.has(token.base)) {
      errors.push(`Unknown name "${token.base}".`);
    }
  }
  return { inputs: [...inputs], steps: [...steps], errors: [...new Set(errors)] };
}

export interface StepOrder {
  /** Steps in an order where each comes after the steps it reads. */
  order: string[];
  /** Step keys in a circular reference, with the members of their loop. */
  cycles: Map<string, string[]>;
  /** Step keys that read a circular reference without being in it. */
  afterCycle: Set<string>;
}

// Orders steps by what they read (list order breaks ties), finding circular references with
// Tarjan's strongly connected components.
export function orderSteps(keys: string[], readsOf: Map<string, string[]>): StepOrder {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles = new Map<string, string[]>();
  let counter = 0;

  const connect = (key: string) => {
    index.set(key, counter);
    low.set(key, counter);
    counter += 1;
    stack.push(key);
    onStack.add(key);
    for (const next of readsOf.get(key) ?? []) {
      if (!index.has(next)) {
        connect(next);
        low.set(key, Math.min(low.get(key)!, low.get(next)!));
      } else if (onStack.has(next)) {
        low.set(key, Math.min(low.get(key)!, index.get(next)!));
      }
    }
    if (low.get(key) === index.get(key)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== key);
      const selfLoop = (readsOf.get(key) ?? []).includes(key);
      if (component.length > 1 || selfLoop) {
        const loop = keys.filter((candidate) => component.includes(candidate));
        for (const loopKey of loop) cycles.set(loopKey, loop);
      }
    }
  };
  for (const key of keys) if (!index.has(key)) connect(key);

  const order: string[] = [];
  const placed = new Set<string>();
  const afterCycle = new Set<string>();
  const visit = (key: string, trail: Set<string>) => {
    if (placed.has(key) || trail.has(key)) return;
    trail.add(key);
    for (const next of readsOf.get(key) ?? []) {
      visit(next, trail);
      if (cycles.has(next) || afterCycle.has(next)) {
        if (!cycles.has(key)) afterCycle.add(key);
      }
    }
    trail.delete(key);
    placed.add(key);
    order.push(key);
  };
  for (const key of keys) visit(key, new Set());

  return { order, cycles, afterCycle };
}
