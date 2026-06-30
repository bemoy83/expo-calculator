import type { FocusEvent } from "react";
import type { Field } from "./types";

export function getInitialFieldValue(field: Field): string | number | boolean {
  if (field.defaultValue !== undefined && field.type !== "text") {
    return field.defaultValue;
  }

  switch (field.type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    default:
      return "";
  }
}

export function resolveFieldValuesWithDefaults(
  fields: Field[],
  fieldValues: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const resolved = { ...fieldValues };

  for (const field of fields) {
    if (field.defaultValue === undefined) continue;

    const current = resolved[field.variableName];
    const isEmpty =
      current === undefined ||
      current === null ||
      (typeof current === "string" && current.trim() === "");

    if (isEmpty) {
      resolved[field.variableName] = field.defaultValue;
    }
  }

  return resolved;
}

export function getFieldInputPlaceholder(field: Field): string | undefined {
  if (field.type === "text" && field.defaultValue !== undefined) {
    return String(field.defaultValue);
  }

  return field.description || undefined;
}

export function shouldSelectAllOnFocus(field: Field, value: unknown): boolean {
  if (field.defaultValue !== undefined) {
    return String(value ?? "") === String(field.defaultValue);
  }

  if (field.type === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) && numeric === 0;
  }

  return false;
}

export function handleSelectDefaultOnFocus(
  event: FocusEvent<HTMLInputElement>,
  field: Field,
  value: unknown
) {
  if (shouldSelectAllOnFocus(field, value)) {
    event.target.select();
  }
}
