export function validateVariableIdentifier(value: string, label = 'Variable name'): string | null {
  if (!value.trim()) {
    return `${label} is required`;
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    return `${label} must start with a letter or underscore and contain only letters, numbers, and underscores`;
  }
  return null;
}

export function validateDuplicateVariableName<T extends { id: string; variableName: string }>(
  items: T[],
  variableName: string,
  selectedId: string | null
): string | null {
  const existing = items.find((item) => item.variableName === variableName && item.id !== selectedId);
  return existing ? 'Variable name already exists' : null;
}

export function validatePropertyName<T extends { id: string; name: string }>(
  properties: T[],
  name: string,
  excludeId?: string
): string | null {
  if (!name.trim()) {
    return 'Property name is required';
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return 'Property name must start with a letter or underscore and contain only letters, numbers, and underscores';
  }

  const duplicate = properties.find(
    (property) => property.name.toLowerCase() === name.toLowerCase() && property.id !== excludeId
  );
  return duplicate ? 'Property name already exists' : null;
}
