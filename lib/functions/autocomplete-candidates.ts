import type { Labor, Material, SharedFunction, SharedFunctionParameter } from "../types";
import { categoryForName, getMaterialCategories } from '../utils/material-category';
import { isValidName } from '../formula/identifiers';
import { getMaterialPropertyCatalog } from './material-properties';
import { storedParameterKey, type ParameterSuggestion } from './parameter-suggestions';

// What the function editor offers while a formula is typed: parameters, stored parameters, other
// functions, math functions, constants, labor, and the properties after `name.`.

export type FunctionAutocompleteCandidate = {
  name: string;
  displayName: string;
  type: "field" | "material" | "property" | "function" | "constant" | "labor";
  description?: string;
  functionSignature?: string;
  /** A stored parameter this function doesn't have yet: inserting it adds the parameter too. Its key in `storedParameterKey`. */
  storedKey?: string;
};

/**
 * The properties to offer after `base.` in a formula. A catalog material offers its own. Any
 * other name that could be a material (a material parameter, or no parameter yet, which the
 * editor will offer to create as one) offers every property the catalog knows. Numbers,
 * labor, functions and the like offer none here.
 */
export function getPropertyCandidatesForBase(input: {
  base: string;
  parameters: SharedFunctionParameter[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): FunctionAutocompleteCandidate[] {
  const base = input.base.trim();
  if (!base || !isValidName(base)) return [];
  const lower = base.toLowerCase();
  const param = input.parameters.find((p) => p.name.trim().toLowerCase() === lower);
  if (param) {
    if (param.kind && param.kind !== "material") return [];
  } else if (
    input.labor.some((item) => item.variableName.toLowerCase() === lower) ||
    input.functions.some((fn) => fn.name.trim().toLowerCase() === lower)
  ) {
    return [];
  }

  const own = param ? undefined : input.materials.find((m) => m.variableName.toLowerCase() === lower);
  // A declared parameter uses the category chosen for it. A name not declared yet that is a
  // category (`sheets`, `sheet`) is taken to mean it, as "Create material parameter" will.
  const category = param
    ? param.materialCategory?.trim() || undefined
    : categoryForName(base, getMaterialCategories(input.materials));
  const catalog = getMaterialPropertyCatalog(own ? [own] : input.materials, category);
  return catalog
    .map((info) => ({
      name: `${base}.${info.name}`,
      displayName: `${base}.${info.name}${info.unitSymbol ? ` (${info.unitSymbol})` : ""}`,
      type: "property" as const,
      description: own
        ? own.name
        : category
          ? `On ${info.count} of ${info.total} in ${category}`
          : `On ${info.count} of ${info.total} materials`,
    }));
}

export function collectFunctionAutocompleteCandidates(input: {
  parameters: SharedFunctionParameter[];
  functions: SharedFunction[];
  functionId: string;
  labor: Labor[];
  /** Parameters other functions and calculators have: typed names offer them, and picking one adds it */
  stored?: ParameterSuggestion[];
}): FunctionAutocompleteCandidate[] {
  const candidates: FunctionAutocompleteCandidate[] = [];
  const validParamNames = new Set<string>();

  input.parameters.forEach((param) => {
    const trimmedName = param.name.trim();

    if (
      trimmedName &&
      isValidName(trimmedName) &&
      !validParamNames.has(trimmedName.toLowerCase())
    ) {
      validParamNames.add(trimmedName.toLowerCase());

      const unitDisplay = param.unitSymbol ? ` (${param.unitSymbol})` : "";
      candidates.push({
        name: trimmedName,
        displayName: `${trimmedName}${unitDisplay}`,
        type: "field",
        description: param.label || param.name,
      });
    }
  });

  // Parameters stored elsewhere, for names this function doesn't have yet. Its own come first.
  (input.stored ?? []).forEach((item) => {
    const name = item.name.trim();
    if (!name || !isValidName(name) || validParamNames.has(name.toLowerCase())) return;
    const unitDisplay = item.unitSymbol ? ` (${item.unitSymbol})` : "";
    const places = `${item.uses} ${item.uses === 1 ? "place" : "places"}`;
    candidates.push({
      name,
      displayName: `${name}${unitDisplay}`,
      type: "field",
      description: `${item.label || name} · stored, in ${places}`,
      storedKey: storedParameterKey(item),
    });
  });

  [
    { name: "sqrt", displayName: "sqrt()", description: "Square root" },
    { name: "round", displayName: "round()", description: "Round to nearest integer" },
    { name: "ceil", displayName: "ceil()", description: "Round up" },
    { name: "floor", displayName: "floor()", description: "Round down" },
    { name: "abs", displayName: "abs()", description: "Absolute value" },
    { name: "max", displayName: "max()", description: "Maximum value" },
    { name: "min", displayName: "min()", description: "Minimum value" },
  ].forEach((fn) => {
    candidates.push({
      name: fn.name,
      displayName: fn.displayName,
      type: "function",
      description: fn.description,
    });
  });

  input.functions.forEach((func) => {
    if (
      func.id !== input.functionId &&
      func.name.trim() &&
      isValidName(func.name.trim())
    ) {
      const paramNames = func.parameters
        .filter((param) => param.name.trim() && isValidName(param.name.trim()))
        .map((param) => param.name.trim())
        .join(", ");

      candidates.push({
        name: func.name.trim(),
        displayName: `${func.name.trim()}(${paramNames})`,
        type: "function",
        description: func.description || `User-defined function: ${func.formula}`,
        functionSignature: paramNames,
      });
    }
  });

  [
    { name: "pi", displayName: "pi", description: "Pi (3.14159...)" },
    { name: "e", displayName: "e", description: "Euler's number (2.71828...)" },
  ].forEach((constant) => {
    candidates.push({
      name: constant.name,
      displayName: constant.displayName,
      type: "constant",
      description: constant.description,
    });
  });

  input.labor.forEach((laborItem) => {
    candidates.push({
      name: laborItem.variableName,
      displayName: laborItem.variableName,
      type: "labor",
      description: `${laborItem.name} - ${laborItem.cost}/hour`,
    });

    laborItem.properties?.forEach((prop) => {
      candidates.push({
        name: `${laborItem.variableName}.${prop.name}`,
        displayName: `${laborItem.variableName}.${prop.name}${prop.unitSymbol ? ` (${prop.unitSymbol})` : ""}`,
        type: "property",
        description: prop.name,
      });
    });
  });

  return candidates;
}
