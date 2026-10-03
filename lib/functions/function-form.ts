import type { SharedFunction, SharedFunctionParameter } from "../types";
import { isValidName } from '../formula/identifiers';

// The function editor's form: what it holds, what's wrong with it, and what is saved from it.

export type FunctionFormData = {
  displayName: string;
  name: string;
  description: string;
  formula: string;
  category: string;
};

export function validateFunctionEditorForm(input: {
  formData: FunctionFormData;
  parameters: SharedFunctionParameter[];
  formulaValidation: { valid: boolean; error?: string };
  functions: SharedFunction[];
  functionId: string;
}): { errors: Record<string, string>; validParameters: SharedFunctionParameter[] } {
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
  validParameters: SharedFunctionParameter[];
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
  parameters: SharedFunctionParameter[];
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
