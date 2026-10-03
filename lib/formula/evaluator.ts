import type { MathNode } from 'mathjs';
import { SharedFunction } from '../types';
import { EvaluationContext } from './types';
import { mathInstance } from './math-runtime';
import { MATH_FUNCTIONS } from './parser';
import { createFormulaResolver, type FormulaResolver } from './resolver';
import { messageOf } from './error-messages';

// Works a formula out. mathjs reads it and does the arithmetic and the syntax errors; what this adds is
// what the names in it mean. The parsed formula is walked once, and each name, `thing.property` and call
// to a shared function is replaced by its value (a call by working out the function with the arguments
// it was given), which leaves a formula of numbers and math functions for mathjs to finish.

type Value = string | number | boolean;

// Formulas are read again whenever a function is called, so each is read once.
const parsed = new Map<string, MathNode>();
function parse(formula: string): MathNode {
  let node = parsed.get(formula);
  if (!node) {
    node = mathInstance.parse(formula);
    if (parsed.size > 500) parsed.clear();
    parsed.set(formula, node);
  }
  return node;
}

const constant = (value: number): MathNode => new mathInstance.ConstantNode(value);

/** What the names in a formula can mean: the values it was given, and the catalogs. */
interface Names {
  context: EvaluationContext;
  resolver: FormulaResolver;
  /** Fields that have a number (a picked material or labor counts as its price or rate) */
  numbers: Map<string, number>;
  functions: SharedFunction[];
}

function namesFor(context: EvaluationContext): Names {
  const resolver = createFormulaResolver(context);
  const numbers = new Map<string, number>();
  for (const [name, value] of Object.entries(context.fieldValues)) {
    const number = resolver.resolveNumericValue(value);
    if (number !== null) numbers.set(name, number);
  }
  return { context, resolver, numbers, functions: context.functions || [] };
}

/** A bare name's number: a field's value, else the price of the material it names. */
function numberOf(name: string, names: Names): number | undefined {
  if (MATH_FUNCTIONS.has(name)) return undefined;
  return names.numbers.get(name) ?? names.resolver.materialsByVariableName.get(name)?.price;
}

type Call = MathNode & { fn: MathNode & { name: string }; args: MathNode[] };

function isFunctionCall(node: MathNode): node is Call {
  return node.type === 'FunctionNode' && (node as unknown as { fn: MathNode }).fn.type === 'SymbolNode';
}

/** A call to a shared function (not to a math function). */
function isSharedCall(node: MathNode): node is Call {
  return isFunctionCall(node) && !MATH_FUNCTIONS.has(node.fn.name);
}

/** `base.property` written with a dot, when the base is a plain name. */
function propertyReference(node: MathNode): { base: string; property: string } | null {
  if (node.type !== 'AccessorNode') return null;
  const { object, index } = node as unknown as {
    object: MathNode & { name?: string };
    index: { dotNotation?: boolean; dimensions: Array<MathNode & { value?: unknown }> };
  };
  const key = index.dimensions[0];
  if (object.type !== 'SymbolNode' || !index.dotNotation || index.dimensions.length !== 1 || key.type !== 'ConstantNode' || typeof key.value !== 'string') {
    return null;
  }
  return { base: object.name as string, property: key.value };
}

/** The value of one argument of a shared function's call, as that function should receive it. */
function argumentValue(argument: MathNode, functionName: string, parameter: string, names: Names): Value {
  const { context, resolver } = names;
  if (argument.filter(isSharedCall).length > 0) {
    try {
      return evaluateArgument(argument, { fieldValues: context.fieldValues, materials: context.materials, labor: context.labor, functions: names.functions });
    } catch (error) {
      throw new Error(`Error evaluating nested function call '${argument.toString()}' for function '${functionName}' parameter '${parameter}': ${messageOf(error)}`);
    }
  }
  if (argument.type === 'SymbolNode') {
    const name = (argument as MathNode & { name: string }).name;
    // A name the formula was given passes as it is (a picked material stays the pick, not its price).
    if (name in context.fieldValues) return context.fieldValues[name];
    const material = resolver.materialsByVariableName.get(name);
    if (material) return material.price;
    throw new Error(`Variable '${name}' not found for function '${functionName}' parameter '${parameter}'`);
  }
  if (argument.type === 'ConstantNode' && typeof (argument as MathNode & { value?: unknown }).value === 'number') {
    return (argument as MathNode & { value: number }).value;
  }
  // Arithmetic, or a property of a picked material: worked out as a formula of its own.
  return evaluateArgument(argument, { ...context, functions: names.functions });
}

function callSharedFunction(call: Call, names: Names): number {
  const { context } = names;
  const name = call.fn.name;
  const definition = names.functions.find((candidate) => candidate.name === name);
  if (!definition) throw new Error(`Function '${name}' not found`);
  if (call.args.length !== definition.parameters.length) {
    throw new Error(`Function '${name}' expects ${definition.parameters.length} argument(s), but got ${call.args.length}`);
  }
  const fieldValues: Record<string, Value> = {};
  definition.parameters.forEach((parameter, index) => {
    fieldValues[parameter.name] = argumentValue(call.args[index], name, parameter.name, names);
  });
  return evaluateFormula(definition.formula, { fieldValues, materials: context.materials, labor: context.labor, functions: names.functions });
}

/** `thing.property` replaced by its value; a property of a picked material or labor can fail, and that is said first. */
function resolveProperties(root: MathNode, names: Names): MathNode {
  return root.transform((node) => {
    const reference = propertyReference(node);
    if (!reference) return node;
    if (reference.base in names.context.fieldValues) {
      return constant(names.resolver.resolveFieldProperty(reference.base, reference.property));
    }
    const value = names.resolver.resolveMaterialPropertyOrPrice(reference.base, reference.property);
    // Left as written when the material isn't there, for mathjs to say it doesn't know the name.
    return value !== null ? constant(value) : node;
  });
}

/** Plain names with no value: not counting the arguments of a shared function's call, which are worked out with it. */
function namesWithoutValue(root: MathNode, names: Names): string[] {
  const missing: string[] = [];
  const visit = (node: MathNode, path: string | null, parent: MathNode | null) => {
    if (isSharedCall(node)) return;
    if (node.type === 'SymbolNode') {
      if (path === 'fn' || (parent && parent.type === 'AccessorNode' && path === 'object')) return;
      const name = (node as MathNode & { name: string }).name;
      if (!MATH_FUNCTIONS.has(name) && numberOf(name, names) === undefined) missing.push(name);
      return;
    }
    node.forEach((child, childPath) => visit(child, childPath, node));
  };
  visit(root, null, null);
  return missing;
}

/** The formula with each bare name and each call to a shared function replaced by its value. */
function resolveValues(root: MathNode, names: Names): MathNode {
  // The outermost calls are worked out last to first, and the first to fail is the one said, as it always was.
  const calls: Call[] = [];
  const collect = (node: MathNode) => {
    if (isSharedCall(node)) calls.push(node);
    else node.forEach((child) => collect(child));
  };
  collect(root);
  const values = new Map<MathNode, number>();
  for (const call of [...calls].reverse()) {
    try {
      values.set(call, callSharedFunction(call, names));
    } catch (error) {
      throw new Error(`Error evaluating function '${call.fn.name}': ${messageOf(error)}`);
    }
  }
  return root.transform((node, path, parent) => {
    const value = values.get(node);
    if (value !== undefined) return constant(value);
    if (node.type !== 'SymbolNode' || path === 'fn' || (parent && parent.type === 'AccessorNode' && path === 'object')) return node;
    const number = numberOf((node as MathNode & { name: string }).name, names);
    return number === undefined ? node : constant(number);
  });
}

function evaluateParsed(tree: MathNode, context: EvaluationContext): number {
  const names = namesFor(context);
  const withProperties = resolveProperties(tree, names);
  const missing = namesWithoutValue(withProperties, names);
  if (missing.length > 0) throw new Error(`Missing values for variables: ${missing.join(', ')}`);
  const resolved = resolveValues(withProperties, names);

  let result: unknown;
  try {
    result = resolved.evaluate();
  } catch (evalError) {
    throw new Error(`Formula evaluation failed: ${messageOf(evalError) || 'Invalid expression'}`);
  }
  if (typeof result !== 'number') throw new Error(`Formula returned non-numeric result: ${typeof result}`);
  if (isNaN(result)) throw new Error('Formula evaluated to NaN (Not a Number)');
  if (!isFinite(result)) throw new Error(`Formula evaluated to ${result > 0 ? 'positive' : 'negative'} infinity`);
  return result;
}

/** What a failed evaluation says: its own message when that is one of ours, else "Formula evaluation failed: …". */
function wording(error: unknown): unknown {
  const message = messageOf(error);
  if (message && (
    message.includes('round()') ||
    message.includes('ceil()') ||
    message.includes('floor()') ||
    message.includes('Missing values for variables') ||
    message.includes('Formula evaluation failed') ||
    message.includes('Formula returned non-numeric') ||
    message.includes('Formula evaluated to')
  )) {
    return error;
  }
  return new Error(`Formula evaluation failed: ${message || 'Invalid formula syntax'}`);
}

/** A formula of its own inside a call (an argument that is arithmetic or a property): failing as any formula does. */
function evaluateArgument(tree: MathNode, context: EvaluationContext): number {
  try {
    return evaluateParsed(tree, context);
  } catch (error) {
    throw wording(error);
  }
}

export function evaluateFormula(formula: string, context: EvaluationContext): number {
  try {
    return evaluateParsed(parse(formula), context);
  } catch (error) {
    throw wording(error);
  }
}
