import type { Calculator } from "../calculator/types";
import type { FunctionParamKind, SharedFunction, SharedFunctionParameter } from "../types";
import { getFunctionParamKinds } from "./param-kinds";
import { foldName } from '../formula/identifiers';

// Parameters a function can reuse: the ones other functions and calculators already have, offered
// while writing a formula, and what to do with the names a formula uses that aren't parameters yet.

/**
 * Whether a parameter still needs the person to say what it is, which is when its editor
 * should open by itself. A blank one has nothing yet; a number with no unit and no "Expects"
 * chosen hasn't been defined; a material has to say which category its properties come from.
 * A parameter that arrives defined (reused from storage, a material whose category was found)
 * is left closed.
 */
export function parameterNeedsDefinition(param: SharedFunctionParameter): boolean {
  if (!param.name.trim() && !param.label.trim()) return true;
  const kind = param.kind ?? "number";
  if (kind === "number") return !param.unitSymbol && !param.kind;
  if (kind === "material") return !param.materialCategory;
  return false;
}

/** What tells stored parameters apart in the suggestions: the same name can come in other units. */
export const storedParameterKey = (item: ParameterSuggestion) => [item.name, item.group, item.unitSymbol ?? ""].join("|");

export type ParameterSuggestion = SharedFunctionParameter & {
  /** What it expects, however the source left it unset: how the list is grouped */
  group: FunctionParamKind;
  /** How many functions and calculators have a parameter or input like it */
  uses: number;
};

const GROUP_ORDER: FunctionParamKind[] = ["number", "material", "labor", "boolean"];

/**
 * Parameters to reuse when writing a function, each once: from the other functions, then
 * calculator inputs (text notes left out), with label, unit and kind. "Left on automatic" and
 * "number" are the same thing, and a name with no unit folds into the same name with one. The
 * same name with different units stays separate (width in mm and width in m). Grouped by what
 * they expect, the most used first.
 */
export function getParameterSuggestions(
  functions: SharedFunction[],
  calculators: Calculator[],
  exceptFunctionId?: string
): ParameterSuggestion[] {
  const suggestions = new Map<string, ParameterSuggestion>();
  const offer = (param: SharedFunctionParameter, group: FunctionParamKind) => {
    const name = param.name.trim();
    if (!name) return;
    const key = [name.toLowerCase(), group, param.unitSymbol ?? ""].join("|");
    const found = suggestions.get(key);
    if (found) {
      found.uses += 1;
      if (!found.label.trim() || found.label === found.name) found.label = param.label.trim() || found.label;
      return;
    }
    suggestions.set(key, { ...param, name, label: param.label.trim() || name, group, uses: 1 });
  };

  functions
    .filter((func) => func.id !== exceptFunctionId)
    .forEach((func) => {
      const kinds = getFunctionParamKinds(func);
      func.parameters.forEach((param) => offer({ ...param, required: true }, kinds[param.name] ?? "number"));
    });

  calculators.forEach((calculator) => {
    calculator.inputs.forEach((input) => {
      const spec = input.value;
      if (spec.kind === "text") return;
      if (spec.kind === "number" || spec.kind === "choice") {
        offer(
          {
            name: input.key,
            label: input.label,
            unitSymbol: spec.unitSymbol || undefined,
            unitCategory: spec.unitCategory,
            required: true,
          },
          "number"
        );
      } else {
        offer({ name: input.key, label: input.label, kind: spec.kind, required: true }, spec.kind);
      }
    });
  });

  // `height` with no unit is the same parameter as `height` in m; fold it into the one with a unit.
  const list = Array.from(suggestions.values());
  const merged = list.filter((item) => {
    if (item.unitSymbol) return true;
    const withUnit = list.find(
      (other) => other.unitSymbol && other.group === item.group && other.name.toLowerCase() === item.name.toLowerCase()
    );
    if (withUnit) withUnit.uses += item.uses;
    return !withUnit;
  });

  return merged.sort(
    (a, b) =>
      GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
      b.uses - a.uses ||
      a.name.localeCompare(b.name) ||
      (a.unitSymbol ?? "").localeCompare(b.unitSymbol ?? "")
  );
}

export function getExistingParameterNames(parameters: SharedFunctionParameter[]): Set<string> {
  return new Set(
    parameters
      .map((param) => param.name.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Adds a copy of `suggestion` unless a parameter has its name, filling a blank one first. */
export function addSuggestedParameter(
  parameters: SharedFunctionParameter[],
  suggestion: SharedFunctionParameter
): SharedFunctionParameter[] {
  const name = suggestion.name.trim();
  if (!name) return parameters;
  if (parameters.some((param) => param.name.trim().toLowerCase() === name.toLowerCase())) return parameters;

  // The grouping fields belong to the list, not to the parameter.
  const { group: _group, uses: _uses, ...rest } = suggestion as SharedFunctionParameter & Partial<ParameterSuggestion>;
  const added: SharedFunctionParameter = { ...rest, name, required: true };
  const blank = parameters.findIndex((param) => !param.name.trim() && !param.label.trim());
  if (blank === -1) return [...parameters, added];
  return parameters.map((param, index) => (index === blank ? added : param));
}

/**
 * Stored parameters that go by the name a formula uses: the ones other functions and calculators
 * already have, most used first. Only the same name counts (not a likely misspelling), so what
 * the formula says is what the parameter is called. A name read with `.property` is a material.
 */
export function findStoredParametersNamed(
  name: string,
  stored: ParameterSuggestion[],
  asMaterial: boolean,
  limit = 3
): ParameterSuggestion[] {
  const key = foldName(name);
  if (!key) return [];
  return stored
    .filter((item) => foldName(item.name) === key && (item.group === "material") === asMaterial)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, limit);
}

/**
 * What a bulk action does with the names a formula uses that aren't parameters yet. A name with
 * exactly one stored parameter of that name is reused; a name with none is created; a name with
 * several (the same name in other units) is left for the person to choose, so a click never
 * guesses a unit.
 */
export function planUnknownNames(
  names: string[],
  formula: string,
  stored: ParameterSuggestion[]
): { reuse: Array<{ name: string; stored: ParameterSuggestion }>; create: string[]; choose: string[] } {
  const plan = { reuse: [] as Array<{ name: string; stored: ParameterSuggestion }>, create: [] as string[], choose: [] as string[] };
  names.forEach((name) => {
    const matches = findStoredParametersNamed(name, stored, formula.includes(`${name}.`), 2);
    if (matches.length === 1) plan.reuse.push({ name, stored: matches[0] });
    else if (matches.length === 0) plan.create.push(name);
    else plan.choose.push(name);
  });
  return plan;
}
