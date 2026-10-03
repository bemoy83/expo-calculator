import { Material, Labor } from '../types';
import { normalizeToBase } from '../units';
import { priceToBase } from '../catalog/prices';
import { EvaluationContext } from './types';

export interface FormulaResolver {
  materialsByVariableName: Map<string, Material>;
  laborByVariableName: Map<string, Labor>;
  resolveNumericValue: (value: string | number | boolean | undefined) => number | null;
  resolveMaterialPropertyOrPrice: (materialVar: string, propertyName: string) => number | null;
  resolveFieldProperty: (fieldVar: string, propertyName: string) => number;
}

export function createFormulaResolver(context: EvaluationContext): FormulaResolver {
  const materialsByVariableName = new Map(context.materials.map((material) => [material.variableName, material]));
  const laborByVariableName = new Map((context.labor ?? []).map((laborItem) => [laborItem.variableName, laborItem]));

  const resolveNumericValue = (value: string | number | boolean | undefined): number | null => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;

    const material = materialsByVariableName.get(value);
    if (material) return material.price;

    const laborItem = laborByVariableName.get(value);
    if (laborItem) return laborItem.cost;

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const resolveMaterialPropertyForMap = (materialVar: string, propertyName: string): number | null => {
    const material = materialsByVariableName.get(materialVar);
    if (!material || !material.properties) {
      return null;
    }

    return getMaterialPropertyValueFromMaterial(material, propertyName);
  };

  const resolveFieldPropertyForContext = (fieldVar: string, propertyName: string): number => {
    const fieldValue = context.fieldValues[fieldVar];

    if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
      throw new Error(`Field "${fieldVar}" is not a material/labor field or no item is selected`);
    }

    const material = materialsByVariableName.get(fieldValue);
    if (material) {
      const propertyValue = getMaterialValue(material, propertyName);
      if (propertyValue === null) {
        throw new Error(`Property "${propertyName}" not found on selected material "${material.name}" for field "${fieldVar}"`);
      }
      return propertyValue;
    }

    const laborItem = laborByVariableName.get(fieldValue);
    if (laborItem) {
      const propertyValue = getLaborValue(laborItem, propertyName);
      if (propertyValue === null) {
        throw new Error(`Property "${propertyName}" not found on selected labor "${laborItem.name}" for field "${fieldVar}"`);
      }
      return propertyValue;
    }

    throw new Error(`No material or labor selected for field "${fieldVar}"`);
  };

  return {
    materialsByVariableName,
    laborByVariableName,
    resolveNumericValue,
    resolveMaterialPropertyOrPrice(materialVar, propertyName) {
      const propertyValue = resolveMaterialPropertyForMap(materialVar, propertyName);
      if (propertyValue !== null) {
        return propertyValue;
      }
      return materialsByVariableName.get(materialVar)?.price ?? null;
    },
    resolveFieldProperty: resolveFieldPropertyForContext,
  };
}

function getMaterialPropertyValueFromMaterial(
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
    if (!property.unitSymbol) return rawValue;
    return property.type === 'price' ? priceToBase(rawValue, property.unitSymbol) : normalizeToBase(rawValue, property.unitSymbol);
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
 * A property of a picked material, where `price` without a property of that name is the
 * material's default price (its Price per unit).
 */
export function getMaterialValue(material: Material, propertyName: string): number | null {
  const value = getMaterialPropertyValueFromMaterial(material, propertyName);
  if (value !== null) return value;
  return propertyName === 'price' ? material.price : null;
}

/** A property of picked labor, where `cost` without a property of that name is its rate. */
export function getLaborValue(laborItem: Labor, propertyName: string): number | null {
  const value = getLaborPropertyValueFromLabor(laborItem, propertyName);
  if (value !== null) return value;
  return propertyName === 'cost' ? laborItem.cost : null;
}

function getLaborPropertyValueFromLabor(
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
