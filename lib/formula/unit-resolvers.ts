import type { Calculator, CalculatorLibrary } from '../calculator/types';
import type { SharedFunction } from '../types';
import { getUnitCategory, type UnitCategory } from '../units';
import { analyzeUnits, categoryOfDim, type UnitResolver } from './unit-analysis';

// What the names in a formula are measured in, for each place a formula is written.

type Catalog = Pick<CalculatorLibrary, 'materials' | 'functions'>;

/** The unit category something is declared with: its category, else the one its symbol belongs to. */
export const declaredCategory = (unit: { unitCategory?: UnitCategory; unitSymbol?: string } | undefined): UnitCategory | undefined =>
  unit?.unitCategory ?? (unit?.unitSymbol ? getUnitCategory(unit.unitSymbol) : undefined);

/**
 * What an input or step is declared in, by its key: the one answer to "what unit is this?" that the
 * hints under the formula and the unit analysis both build on. Nothing declared (a material pick,
 * a number with no unit, a key that is neither) is `{}`.
 */
export function declaredUnit(
  calculator: Pick<Calculator, 'inputs' | 'steps'>,
  key: string
): { category?: UnitCategory; symbol?: string } {
  const input = calculator.inputs.find((candidate) => candidate.key === key);
  if (input) {
    return input.value.kind === 'number' || input.value.kind === 'choice'
      ? { category: declaredCategory(input.value), symbol: input.value.unitSymbol }
      : {};
  }
  const step = calculator.steps.find((candidate) => candidate.key === key);
  return step ? { category: declaredCategory(step), symbol: step.unitSymbol } : {};
}

/**
 * What a function returns: the unit it's declared with (only a data import sets one), else what its own
 * formula works out to from its parameters' units. `visiting` stops a function that calls itself.
 */
function returnUnit(name: string, library: Catalog, visiting: ReadonlySet<string> = new Set()): UnitCategory | undefined {
  const fn = library.functions.find((candidate) => candidate.name === name);
  if (!fn) return undefined;
  const declared = declaredCategory({ unitCategory: fn.returnUnitCategory, unitSymbol: fn.returnUnitSymbol });
  if (declared || visiting.has(name)) return declared;
  const inferred = analyzeUnits(fn.formula, functionUnitResolver(fn.parameters, library, new Set([...visiting, name])));
  return categoryOfDim(inferred.result);
}

/** A resolver's `call`, each function worked out once. */
function callUnits(library: Catalog, visiting?: ReadonlySet<string>): UnitResolver['call'] {
  const known = new Map<string, UnitCategory | undefined>();
  return (name) => {
    if (!known.has(name)) known.set(name, returnUnit(name, library, visiting));
    return known.get(name);
  };
}

/**
 * What a material property is measured in, when every material it could be (in the category) agrees.
 * Labor properties are rates (per hour) that the unit categories can't express, so they're left unknown.
 */
function materialPropertyUnit(property: string, category: string | undefined, materials: CalculatorLibrary['materials']): UnitCategory | undefined {
  const found = new Set<UnitCategory | undefined>();
  for (const material of materials) {
    if (category && material.category !== category) continue;
    const match = material.properties?.find((candidate) => candidate.name === property);
    // Only a measurement carries its unit as what it's measured in; a price's unit is the "per" (kr per metre is money).
    if (match) found.add(match.type === 'number' ? declaredCategory(match) : undefined);
  }
  return found.size === 1 ? [...found][0] : undefined;
}

/** A calculator step's formula: inputs, other steps, and the properties of picked materials. */
export function calculatorUnitResolver(calculator: Calculator, library: Catalog): UnitResolver {
  return {
    value(base, property) {
      if (property) {
        const input = calculator.inputs.find((candidate) => candidate.key === base);
        return input?.value.kind === 'material' ? materialPropertyUnit(property, input.value.category, library.materials) : undefined;
      }
      const declared = declaredUnit(calculator, base).category;
      if (declared || calculator.inputs.some((candidate) => candidate.key === base)) return declared;
      // A step that declares no unit: money, counts and percentages carry no length or weight of their own.
      const format = calculator.steps.find((candidate) => candidate.key === base)?.format;
      return format === 'money' || format === 'count' ? 'count' : format === 'percent' ? 'percentage' : undefined;
    },
    call: callUnits(library),
    symbol: (base, property) => (property ? undefined : declaredUnit(calculator, base).symbol),
  };
}

/** A function's formula: its parameters, and the properties of a material one. */
export function functionUnitResolver(
  parameters: SharedFunction['parameters'],
  library: Catalog,
  visiting?: ReadonlySet<string>
): UnitResolver {
  return {
    value(base, property) {
      const parameter = parameters.find((candidate) => candidate.name === base);
      if (!parameter) return undefined;
      if (property) return materialPropertyUnit(property, parameter.materialCategory?.trim() || undefined, library.materials);
      return declaredCategory(parameter);
    },
    call: callUnits(library, visiting),
    symbol: (base, property) => (property ? undefined : parameters.find((candidate) => candidate.name === base)?.unitSymbol),
  };
}
