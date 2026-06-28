import { CalculationResolver, Labor, Material } from '../types';

type FieldValues = Record<string, string | number | boolean>;

function materialPropertyValue(material: Material, propertyName: string): number | null {
  const property = material.properties?.find((candidate) => candidate.name === propertyName);
  if (!property) return null;

  if (property.type === 'number' || property.type === 'price') {
    if (property.storedValue !== undefined) return property.storedValue;
    const value = typeof property.value === 'number' ? property.value : Number(property.value);
    return Number.isFinite(value) ? value : null;
  }

  if (property.type === 'boolean') {
    return property.value === true || property.value === 'true' ? 1 : 0;
  }

  const value = Number(property.value);
  return Number.isFinite(value) ? value : null;
}

function laborPropertyValue(laborItem: Labor, propertyName: string): number | null {
  const property = laborItem.properties?.find((candidate) => candidate.name === propertyName);
  if (!property) return null;
  if (property.storedValue !== undefined) return property.storedValue;
  return Number.isFinite(property.value) ? property.value : null;
}

function toNumericSelection(
  value: string | number | boolean | undefined,
  materialsByVariableName: Map<string, Material>,
  laborByVariableName: Map<string, Labor>
): number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;

  const material = materialsByVariableName.get(value);
  if (material) return material.price;

  const laborItem = laborByVariableName.get(value);
  if (laborItem) return laborItem.cost;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function createCalculationResolver(input: {
  fieldValues: FieldValues;
  materials: Material[];
  labor?: Labor[];
}): CalculationResolver {
  const materialsByVariableName = new Map(input.materials.map((material) => [material.variableName, material]));
  const laborByVariableName = new Map((input.labor ?? []).map((laborItem) => [laborItem.variableName, laborItem]));

  return {
    resolveValue(name) {
      if (name in input.fieldValues) {
        return toNumericSelection(input.fieldValues[name], materialsByVariableName, laborByVariableName);
      }

      const material = materialsByVariableName.get(name);
      if (material) return material.price;

      const laborItem = laborByVariableName.get(name);
      if (laborItem) return laborItem.cost;

      return null;
    },
    resolveProperty(base, property) {
      const selectedValue = input.fieldValues[base];
      if (typeof selectedValue === 'string') {
        const selectedMaterial = materialsByVariableName.get(selectedValue);
        if (selectedMaterial) return materialPropertyValue(selectedMaterial, property);

        const selectedLabor = laborByVariableName.get(selectedValue);
        if (selectedLabor) return laborPropertyValue(selectedLabor, property);
      }

      const material = materialsByVariableName.get(base);
      if (material) return materialPropertyValue(material, property);

      const laborItem = laborByVariableName.get(base);
      if (laborItem) return laborPropertyValue(laborItem, property);

      return null;
    },
  };
}
