import type { Calculator, CalculatorLibrary } from '../calculator/types';
import type { SharedFunction } from '../types';
import { getUnitCategory, type UnitCategory } from '../units';
import { analyzeUnits, categoryOfDim, type UnitResolver } from './unit-analysis';

// What the names in a formula are measured in, for each place a formula is written.

type Catalog = Pick<CalculatorLibrary, 'materials' | 'functions'>;

const categoryOf = (unit: { unitCategory?: UnitCategory; unitSymbol?: string } | undefined): UnitCategory | undefined =>
  unit?.unitCategory ?? (unit?.unitSymbol ? getUnitCategory(unit.unitSymbol) : undefined);

/**
 * What a function returns: the unit it's declared with (only a data import sets one), else what its own
 * formula works out to from its parameters' units. `visiting` stops a function that calls itself.
 */
function returnUnit(name: string, library: Catalog, visiting: ReadonlySet<string> = new Set()): UnitCategory | undefined {
  const fn = library.functions.find((candidate) => candidate.name === name);
  if (!fn) return undefined;
  const declared = fn.returnUnitCategory ?? (fn.returnUnitSymbol ? getUnitCategory(fn.returnUnitSymbol) : undefined);
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
    if (match) found.add(match.type === 'number' ? categoryOf(match) : undefined);
  }
  return found.size === 1 ? [...found][0] : undefined;
}

/** A calculator step's formula: inputs, other steps, and the properties of picked materials. */
export function calculatorUnitResolver(calculator: Calculator, library: Catalog): UnitResolver {
  return {
    value(base, property) {
      const input = calculator.inputs.find((candidate) => candidate.key === base);
      if (property) {
        return input?.value.kind === 'material' ? materialPropertyUnit(property, input.value.category, library.materials) : undefined;
      }
      if (input) {
        return input.value.kind === 'number' || input.value.kind === 'choice' ? categoryOf(input.value) : undefined;
      }
      const step = calculator.steps.find((candidate) => candidate.key === base);
      if (!step) return undefined;
      const declared = categoryOf(step);
      if (declared) return declared;
      // Money, counts and percentages carry no length or weight of their own.
      return step.format === 'money' || step.format === 'count' ? 'count' : step.format === 'percent' ? 'percentage' : undefined;
    },
    call: callUnits(library),
    symbol(base, property) {
      if (property) return undefined;
      const input = calculator.inputs.find((candidate) => candidate.key === base);
      if (input) return input.value.kind === 'number' || input.value.kind === 'choice' ? input.value.unitSymbol : undefined;
      return calculator.steps.find((candidate) => candidate.key === base)?.unitSymbol;
    },
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
      return categoryOf(parameter);
    },
    call: callUnits(library, visiting),
    symbol: (base, property) => (property ? undefined : parameters.find((candidate) => candidate.name === base)?.unitSymbol),
  };
}

/** A declared unit, as a category. */
export function declaredCategory(unit: { unitCategory?: UnitCategory; unitSymbol?: string } | undefined): UnitCategory | undefined {
  return categoryOf(unit);
}
