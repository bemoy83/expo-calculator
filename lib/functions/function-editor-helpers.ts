import type { Calculator } from "../calculator/types";
import type { Labor, SharedFunction } from "../types";
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

/**
 * Parameters to reuse when writing a function: those of the other functions first, then
 * calculator inputs (text notes left out), each with its label, unit and kind. The same name
 * with a different unit or kind is offered separately (width in mm and width in m).
 */
export function getParameterSuggestions(
  functions: SharedFunction[],
  calculators: Calculator[],
  exceptFunctionId?: string
): FunctionParameter[] {
  const suggestions = new Map<string, FunctionParameter>();
  const offer = (param: FunctionParameter) => {
    const name = param.name.trim();
    if (!name) return;
    const key = [name.toLowerCase(), param.kind ?? '', param.unitSymbol ?? ''].join('|');
    if (!suggestions.has(key)) suggestions.set(key, { ...param, name, label: param.label.trim() || name });
  };

  functions
    .filter((func) => func.id !== exceptFunctionId)
    .forEach((func) => func.parameters.forEach((param) => offer({ ...param, required: true })));

  calculators.forEach((calculator) => {
    calculator.inputs.forEach((input) => {
      const spec = input.value;
      if (spec.kind === 'text') return;
      if (spec.kind === 'number' || spec.kind === 'choice') {
        offer({
          name: input.key,
          label: input.label,
          unitSymbol: spec.unitSymbol || undefined,
          unitCategory: spec.unitCategory,
          required: true,
        });
      } else {
        offer({ name: input.key, label: input.label, kind: spec.kind, required: true });
      }
    });
  });

  return Array.from(suggestions.values()).sort(
    (a, b) => a.name.localeCompare(b.name) || (a.unitSymbol ?? '').localeCompare(b.unitSymbol ?? '')
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

  const added: FunctionParameter = { ...suggestion, name, required: true };
  const blank = parameters.findIndex((param) => !param.name.trim() && !param.label.trim());
  if (blank === -1) return [...parameters, added];
  return parameters.map((param, index) => (index === blank ? added : param));
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
