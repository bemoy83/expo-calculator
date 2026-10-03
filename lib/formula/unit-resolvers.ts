import type { Calculator, CalculatorLibrary } from '../calculator/types';
import type { SharedFunction } from '../types';
import { getUnitCategory, type UnitCategory } from '../units';
import type { UnitResolver } from './unit-analysis';

// What the names in a formula are measured in, for each place a formula is written.

type Catalog = Pick<CalculatorLibrary, 'materials' | 'functions'>;

const categoryOf = (unit: { unitCategory?: UnitCategory; unitSymbol?: string } | undefined): UnitCategory | undefined =>
  unit?.unitCategory ?? (unit?.unitSymbol ? getUnitCategory(unit.unitSymbol) : undefined);

/** What a function returns, as it's declared. */
function returnUnit(name: string, functions: CalculatorLibrary['functions']): UnitCategory | undefined {
  const fn = functions.find((candidate) => candidate.name === name);
  return fn?.returnUnitCategory ?? (fn?.returnUnitSymbol ? getUnitCategory(fn.returnUnitSymbol) : undefined);
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
    if (match) found.add(categoryOf(match));
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
    call: (name) => returnUnit(name, library.functions),
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
  library: Catalog
): UnitResolver {
  return {
    value(base, property) {
      const parameter = parameters.find((candidate) => candidate.name === base);
      if (!parameter) return undefined;
      if (property) return materialPropertyUnit(property, parameter.materialCategory?.trim() || undefined, library.materials);
      return categoryOf(parameter);
    },
    call: (name) => returnUnit(name, library.functions),
    symbol: (base, property) => (property ? undefined : parameters.find((candidate) => candidate.name === base)?.unitSymbol),
  };
}

/** A declared unit, as a category. */
export function declaredCategory(unit: { unitCategory?: UnitCategory; unitSymbol?: string } | undefined): UnitCategory | undefined {
  return categoryOf(unit);
}
