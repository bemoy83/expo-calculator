import { CalculationResolver, Material, Labor } from '../types';
import { UnitCategory, getUnitCategory, normalizeToBase } from '../units';
import { EvaluationContext } from './types';

type FieldValues = Record<string, string | number | boolean>;

export function resolveMaterialProperty(
  materialVar: string,
  propertyName: string,
  materials: Material[]
): number | null {
  const material = materials.find((m) => m.variableName === materialVar);
  if (!material || !material.properties) {
    return null;
  }

  return getMaterialPropertyValueFromMaterial(material, propertyName);
}

/**
 * Gets the unit category for a material property
 */
export function getMaterialPropertyUnitCategory(
  materialVar: string,
  propertyName: string,
  materials: Material[]
): UnitCategory | undefined {
  const material = materials.find((m) => m.variableName === materialVar);
  if (!material || !material.properties) {
    return undefined;
  }

  const property = material.properties.find((p) => p.name === propertyName);
  if (!property) {
    return undefined;
  }

  // Use unitCategory if available, otherwise infer from unitSymbol
  if (property.unitCategory) {
    return property.unitCategory;
  }
  if (property.unitSymbol) {
    return getUnitCategory(property.unitSymbol);
  }

  return undefined;
}

export function getMaterialPropertyValueFromMaterial(
  material: Material,
  propertyName: string
): number | null {
  if (!material.properties) {
    return null;
  }

  const property = material.properties.find((p) => p.name === propertyName);
  if (!property) {
    return null;
  }

  if (property.type === 'number' || property.type === 'price') {
    if (property.storedValue !== undefined) {
      return property.storedValue;
    }
    const rawValue = typeof property.value === 'number' ? property.value : Number(property.value) || 0;
    return property.unitSymbol ? normalizeToBase(rawValue, property.unitSymbol) : rawValue;
  }

  if (property.type === 'boolean') {
    return property.value === true || property.value === 'true' ? 1 : 0;
  }

  if (property.type === 'string') {
    const rawValue = Number(property.value);
    return !isNaN(rawValue) && isFinite(rawValue) ? rawValue : 0;
  }

  return null;
}

/**
 * Resolves a field property reference to its numeric value (base-normalized)
 * Returns the property value converted to a number
 * Throws error if material/labor not selected or property doesn't exist
 */
export function resolveFieldProperty(
  fieldVar: string,
  propertyName: string,
  context: EvaluationContext
): number {
  let fieldValue = context.fieldValues[fieldVar];

  // If field value is missing or empty, try to get default from field definition
  if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
    if (context.fields) {
      const field = context.fields.find(f => f.variableName === fieldVar);
      if (field && field.defaultValue !== undefined) {
        fieldValue = field.defaultValue;
      }
    }
  }

  // Check if field value is a material or labor selection (string matching variableName)
  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new Error(`Field "${fieldVar}" is not a material/labor field or no item is selected`);
  }

  // Check if it's a material
  const material = context.materials.find((m) => m.variableName === fieldValue);
  if (material) {
    const propertyValue = resolveMaterialProperty(fieldValue, propertyName, context.materials);
    if (propertyValue === null) {
      throw new Error(`Property "${propertyName}" not found on selected material "${material.name}" for field "${fieldVar}"`);
    }
    return propertyValue;
  }

  // Check if it's a labor item
  if (context.labor && context.labor.length > 0) {
    const laborItem = context.labor.find((l) => l.variableName === fieldValue);
    if (laborItem) {
      const propertyValue = resolveLaborProperty(fieldValue, propertyName, context.labor);
      if (propertyValue === null) {
        throw new Error(`Property "${propertyName}" not found on selected labor "${laborItem.name}" for field "${fieldVar}"`);
      }
      return propertyValue;
    }
  }

  throw new Error(`No material or labor selected for field "${fieldVar}"`);
}

/**
 * Resolves a labor property reference to its numeric value (base-normalized)
 * Returns the property value converted to a number, or null if not found
 */
export function resolveLaborProperty(
  laborVar: string,
  propertyName: string,
  labor: Labor[]
): number | null {
  const laborItem = labor.find((l) => l.variableName === laborVar);
  if (!laborItem || !laborItem.properties) {
    return null;
  }

  return getLaborPropertyValueFromLabor(laborItem, propertyName);
}

/**
 * Gets the unit category for a labor property
 */
export function getLaborPropertyUnitCategory(
  laborVar: string,
  propertyName: string,
  labor: Labor[]
): UnitCategory | undefined {
  const laborItem = labor.find((l) => l.variableName === laborVar);
  if (!laborItem || !laborItem.properties) {
    return undefined;
  }

  const property = laborItem.properties.find((p) => p.name === propertyName);
  if (!property) {
    return undefined;
  }

  // Use unitCategory if available, otherwise infer from unitSymbol
  if (property.unitCategory) {
    return property.unitCategory;
  }
  if (property.unitSymbol) {
    return getUnitCategory(property.unitSymbol);
  }

  return undefined;
}

export function getLaborPropertyValueFromLabor(
  laborItem: Labor,
  propertyName: string
): number | null {
  if (!laborItem.properties) {
    return null;
  }

  const property = laborItem.properties.find((p) => p.name === propertyName);
  if (!property) {
    return null;
  }

  if (property.type === 'number') {
    if (property.storedValue !== undefined) {
      return property.storedValue;
    }
    const rawValue = typeof property.value === 'number' ? property.value : Number(property.value) || 0;
    return property.unitSymbol ? normalizeToBase(rawValue, property.unitSymbol) : rawValue;
  }

  return null;
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
        if (selectedMaterial) return getMaterialPropertyValueFromMaterial(selectedMaterial, property);

        const selectedLabor = laborByVariableName.get(selectedValue);
        if (selectedLabor) return getLaborPropertyValueFromLabor(selectedLabor, property);
      }

      const material = materialsByVariableName.get(base);
      if (material) return getMaterialPropertyValueFromMaterial(material, property);

      const laborItem = laborByVariableName.get(base);
      if (laborItem) return getLaborPropertyValueFromLabor(laborItem, property);

      return null;
    },
  };
}
