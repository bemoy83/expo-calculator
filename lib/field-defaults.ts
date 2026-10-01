import type { Field } from "./types";

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
