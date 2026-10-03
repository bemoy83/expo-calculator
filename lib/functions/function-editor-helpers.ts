import type { Calculator } from "../calculator/types";
import type { FunctionParamKind, Labor, Material, SharedFunction } from "../types";
import { getFunctionParamKinds } from "./param-kinds";
import { categoryForName, editDistance, getMaterialCategories, sameCategory } from '../utils/material-category';
import { isValidName } from '../formula/identifiers';

export type FunctionFormData = {
  displayName: string;
  name: string;
  description: string;
  formula: string;
  category: string;
};

export type FunctionAutocompleteCandidate = {
  name: string;
  displayName: string;
  type: "field" | "material" | "property" | "function" | "constant" | "labor";
  description?: string;
  functionSignature?: string;
};

type FunctionParameter = SharedFunction["parameters"][number];

export type ParameterSuggestion = FunctionParameter & {
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
  const offer = (param: FunctionParameter, group: FunctionParamKind) => {
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

export function getExistingParameterNames(parameters: FunctionParameter[]): Set<string> {
  return new Set(
    parameters
      .map((param) => param.name.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Adds a copy of `suggestion` unless a parameter has its name, filling a blank one first. */
export function addSuggestedParameter(
  parameters: FunctionParameter[],
  suggestion: FunctionParameter
): FunctionParameter[] {
  const name = suggestion.name.trim();
  if (!name) return parameters;
  if (parameters.some((param) => param.name.trim().toLowerCase() === name.toLowerCase())) return parameters;

  // The grouping fields belong to the list, not to the parameter.
  const { group: _group, uses: _uses, ...rest } = suggestion as FunctionParameter & Partial<ParameterSuggestion>;
  const added: FunctionParameter = { ...rest, name, required: true };
  const blank = parameters.findIndex((param) => !param.name.trim() && !param.label.trim());
  if (blank === -1) return [...parameters, added];
  return parameters.map((param, index) => (index === blank ? added : param));
}

export type MaterialPropertyInfo = { name: string; unitSymbol?: string; count: number; total: number };

/**
 * Every property name the catalog's materials define, with how many have each. Nothing is
 * assumed: a property no material has isn't offered, since a call couldn't pass a value for it. A material parameter doesn't know its material until a
 * calculator picks one, so this is what `board.` can offer.
 */
export function getMaterialPropertyCatalog(allMaterials: Material[], category?: string): MaterialPropertyInfo[] {
  const materials = category ? allMaterials.filter((material) => sameCategory(material.category, category)) : allMaterials;
  const found = new Map<string, MaterialPropertyInfo>();
  const total = materials.length;
  materials.forEach((material) => {
    const seen = new Set<string>();
    material.properties?.forEach((prop) => {
      const name = prop.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      const info = found.get(key) ?? { name, unitSymbol: prop.unitSymbol, count: 0, total };
      info.count += 1;
      info.unitSymbol ??= prop.unitSymbol;
      found.set(key, info);
    });
  });
  return Array.from(found.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** A parameter is a material when marked so, or (kind left automatic) once the formula uses a dot on it. */
function isMaterialParameter(param: FunctionParameter, formula: string): boolean {
  if (param.kind) return param.kind === "material";
  const escaped = param.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return !!param.name.trim() && new RegExp(`(^|[^\\w.])${escaped}\\.`).test(formula);
}

/**
 * The properties to offer after `base.` in a formula. A catalog material offers its own. Any
 * other name that could be a material (a material parameter, or no parameter yet, which the
 * editor will offer to create as one) offers every property the catalog knows. Numbers,
 * labor, functions and the like offer none here.
 */
export function getPropertyCandidatesForBase(input: {
  base: string;
  parameters: FunctionParameter[];
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

/**
 * `board.widht` where no material has a `widht`: the likely typos, each with the property it
 * probably meant. A property some materials lack is not flagged; only names found nowhere.
 */
export function findUnknownMaterialProperties(input: {
  formula: string;
  parameters: FunctionParameter[];
  materials: Material[];
}): Array<{ reference: string; suggestion?: string }> {
  const unknown = new Map<string, { reference: string; suggestion?: string }>();
  input.parameters.forEach((param) => {
    const name = param.name.trim();
    if (!name || !isMaterialParameter(param, input.formula)) return;
    const known = getMaterialPropertyCatalog(input.materials, param.materialCategory?.trim() || undefined).map((info) => info.name);
    const knownLower = new Set(known.map((candidate) => candidate.toLowerCase()));
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|[^\\w.])${escaped}\\.([A-Za-z_]\\w*)(?!\\w)`, "g");
    for (const match of input.formula.matchAll(pattern)) {
      const prop = match[1];
      if (knownLower.has(prop.toLowerCase()) || unknown.has(`${name}.${prop}`)) continue;
      const best = known
        .map((candidate) => ({ candidate, distance: editDistance(prop.toLowerCase(), candidate.toLowerCase()) }))
        .sort((a, b) => a.distance - b.distance)[0];
      unknown.set(`${name}.${prop}`, {
        reference: `${name}.${prop}`,
        suggestion: best && best.distance <= Math.max(2, Math.floor(prop.length / 3)) ? best.candidate : undefined,
      });
    }
  });
  return Array.from(unknown.values());
}

export function collectFunctionAutocompleteCandidates(input: {
  parameters: FunctionParameter[];
  functions: SharedFunction[];
  functionId: string;
  labor: Labor[];
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

export function getFormulaWithInsertedToken(input: {
  currentValue: string;
  start: number;
  end: number;
  token: string;
}): { value: string; cursorPosition: number } {
  const before = input.currentValue.substring(0, input.start);
  const after = input.currentValue.substring(input.end);
  const charBefore = input.start > 0 ? input.currentValue[input.start - 1] : "";
  const needsSpaceBefore =
    input.start > 0 && charBefore !== " " && charBefore !== "\t" && !/[+\-*/(]/.test(charBefore);
  const charAfter = input.end < input.currentValue.length ? input.currentValue[input.end] : "";
  const needsSpaceAfter =
    input.end < input.currentValue.length && charAfter !== " " && charAfter !== "\t" && !/[+\-*/)]/.test(charAfter);
  const insertedText = `${needsSpaceBefore ? " " : ""}${input.token}${needsSpaceAfter ? " " : ""}`;

  return {
    value: before + insertedText + after,
    cursorPosition: input.start + insertedText.length,
  };
}

const COMPARISON_OPERATORS = ["==", "!=", ">=", "<=", ">", "<"];

export function getFormulaWithInsertedOperator(input: {
  currentValue: string;
  start: number;
  end: number;
  operator: string;
}): { value: string; cursorPosition: number } {
  const before = input.currentValue.substring(0, input.start);
  const after = input.currentValue.substring(input.end);
  const charBefore = input.start > 0 ? input.currentValue[input.start - 1] : "";
  // Operators get a space on each side, so the next value can be typed straight after.
  const needsSpaceBefore = input.start > 0 && !/\s/.test(charBefore) && charBefore !== "(";
  const charAfter = input.end < input.currentValue.length ? input.currentValue[input.end] : "";
  const needsSpaceAfter = !/\s/.test(charAfter);
  const spaceBefore = needsSpaceBefore ? " " : "";

  const selectedText = input.currentValue.substring(input.start, input.end);

  // A comparison with something selected wraps it as a yes/no condition, `(sel == )`, and the
  // cursor goes before ")" to type what it's compared with.
  if (selectedText && COMPARISON_OPERATORS.includes(input.operator)) {
    const insertedText = `${spaceBefore}(${selectedText} ${input.operator} )`;
    return { value: before + insertedText + after, cursorPosition: input.start + insertedText.length - 1 };
  }

  // A function or brackets: what's selected goes inside, as the first argument, and the cursor
  // goes where the next thing is typed: inside the brackets, or before the ")" of round(x, ).
  const open = input.operator.indexOf("(");
  if (open !== -1) {
    const selected = input.currentValue.substring(input.start, input.end);
    const inside = input.operator.slice(0, open + 1) + selected;
    const rest = input.operator.slice(open + 1);
    const insertedText = `${spaceBefore}${inside}${rest}`;
    const cursorInRest = !selected ? 0 : rest.startsWith(")") ? rest.length : rest.indexOf(")");
    return {
      value: before + insertedText + after,
      cursorPosition: input.start + spaceBefore.length + inside.length + cursorInRest,
    };
  }

  const insertedText = `${spaceBefore}${input.operator}${needsSpaceAfter ? " " : ""}`;

  return {
    value: before + insertedText + after,
    cursorPosition: input.start + insertedText.length,
  };
}

export function validateFunctionEditorForm(input: {
  formData: FunctionFormData;
  parameters: FunctionParameter[];
  formulaValidation: { valid: boolean; error?: string };
  functions: SharedFunction[];
  functionId: string;
}): { errors: Record<string, string>; validParameters: FunctionParameter[] } {
  const errors: Record<string, string> = {};

  if (!input.formData.displayName.trim()) {
    errors.displayName = "Function display name is required";
  }

  if (!input.formData.name.trim()) {
    errors.name = "Function variable name is required";
  } else if (!isValidName(input.formData.name.trim())) {
    errors.name = "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores";
  }

  const duplicate = input.functions.find(
    (fn) => fn.name.toLowerCase() === input.formData.name.toLowerCase().trim() && fn.id !== input.functionId
  );
  if (duplicate) {
    errors.name = "A function with this variable name already exists";
  }

  const validParameters = input.parameters.filter((param) => param.name.trim() && param.label.trim());
  if (validParameters.length === 0) {
    errors.parameters = "At least one parameter is required";
  }

  const paramNames = validParameters.map((param) => param.name.toLowerCase());
  const duplicateParams = paramNames.filter((name, index) => paramNames.indexOf(name) !== index);
  if (duplicateParams.length > 0) {
    errors.parameters = `Duplicate parameter names: ${duplicateParams.join(", ")}`;
  }

  if (!input.formData.formula.trim()) {
    errors.formula = "Formula is required";
  } else if (!input.formulaValidation.valid) {
    errors.formula = input.formulaValidation.error || "Invalid formula";
  }

  return { errors, validParameters };
}

export function buildFunctionSaveData(input: {
  formData: FunctionFormData;
  validParameters: FunctionParameter[];
}): Omit<SharedFunction, "id" | "createdAt" | "updatedAt"> {
  return {
    displayName: input.formData.displayName.trim(),
    name: input.formData.name.trim(),
    description: input.formData.description.trim() || undefined,
    formula: input.formData.formula.trim(),
    parameters: input.validParameters.map((param) => ({
      name: param.name.trim(),
      label: param.label.trim(),
      unitCategory: param.unitCategory,
      unitSymbol: param.unitSymbol,
      required: param.required !== false,
      // What the parameter expects, when chosen ("Expects"); left out it's inferred from the formula.
      ...(param.kind ? { kind: param.kind } : {}),
      ...(param.materialCategory?.trim() ? { materialCategory: param.materialCategory.trim() } : {}),
    })),
    category: input.formData.category.trim() || undefined,
  };
}

export function isFunctionEditorFormSubmittable(input: {
  formData: FunctionFormData;
  parameters: FunctionParameter[];
  formulaValidation: { valid: boolean };
}): boolean {
  return (
    input.formData.displayName.trim() !== "" &&
    input.formData.name.trim() !== "" &&
    isValidName(input.formData.name.trim()) &&
    input.formData.formula.trim() !== "" &&
    input.formulaValidation.valid &&
    input.parameters.some((param) => param.name.trim() && param.label.trim())
  );
}
