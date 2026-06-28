import { CalculationResolver, Material, Labor } from '../types';
import { UnitCategory, getUnitCategory, normalizeToBase } from '../units';
import { EvaluationContext } from './types';

type FieldValues = Record<string, string | number | boolean>;

export interface FormulaResolver {
  materialsByVariableName: Map<string, Material>;
  laborByVariableName: Map<string, Labor>;
  resolveNumericValue: (value: string | number | boolean | undefined) => number | null;
  resolveVariable: (name: string) => number | null;
  resolveMaterialProperty: (materialVar: string, propertyName: string) => number | null;
  resolveLaborProperty: (laborVar: string, propertyName: string) => number | null;
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

  const resolveLaborPropertyForMap = (laborVar: string, propertyName: string): number | null => {
    const laborItem = laborByVariableName.get(laborVar);
    if (!laborItem || !laborItem.properties) {
      return null;
    }

    return getLaborPropertyValueFromLabor(laborItem, propertyName);
  };

  const resolveFieldPropertyForContext = (fieldVar: string, propertyName: string): number => {
    let fieldValue = context.fieldValues[fieldVar];

    if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
      if (context.fields) {
        const field = context.fields.find(f => f.variableName === fieldVar);
        if (field && field.defaultValue !== undefined) {
          fieldValue = field.defaultValue;
        }
      }
    }

    if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
      throw new Error(`Field "${fieldVar}" is not a material/labor field or no item is selected`);
    }

    const material = materialsByVariableName.get(fieldValue);
    if (material) {
      const propertyValue = resolveMaterialPropertyForMap(fieldValue, propertyName);
      if (propertyValue === null) {
        throw new Error(`Property "${propertyName}" not found on selected material "${material.name}" for field "${fieldVar}"`);
      }
      return propertyValue;
    }

    const laborItem = laborByVariableName.get(fieldValue);
    if (laborItem) {
      const propertyValue = resolveLaborPropertyForMap(fieldValue, propertyName);
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
    resolveVariable(name) {
      if (name in context.fieldValues) {
        return resolveNumericValue(context.fieldValues[name]);
      }

      const outputValue = context.functionOutputs?.[name];
      if (outputValue !== undefined) {
        return Number.isFinite(outputValue) ? outputValue : null;
      }

      return resolveNumericValue(name);
    },
    resolveMaterialProperty: resolveMaterialPropertyForMap,
    resolveLaborProperty: resolveLaborPropertyForMap,
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

export function resolveMaterialProperty(
  materialVar: string,
  propertyName: string,
  materials: Material[]
): number | null {
  return createFormulaResolver({ fieldValues: {}, materials }).resolveMaterialProperty(materialVar, propertyName);
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
  return createFormulaResolver(context).resolveFieldProperty(fieldVar, propertyName);
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
  return createFormulaResolver({ fieldValues: {}, materials: [], labor }).resolveLaborProperty(laborVar, propertyName);
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

export function createCalculationResolver(input: {
  fieldValues: FieldValues;
  materials: Material[];
  labor?: Labor[];
}): CalculationResolver {
  const resolver = createFormulaResolver(input);

  return {
    resolveValue(name) {
      return resolver.resolveVariable(name);
    },
    resolveProperty(base, property) {
      const selectedValue = input.fieldValues[base];
      if (typeof selectedValue === 'string') {
        const selectedMaterialValue = resolver.resolveMaterialProperty(selectedValue, property);
        if (selectedMaterialValue !== null) {
          return selectedMaterialValue;
        }

        const selectedLaborValue = resolver.resolveLaborProperty(selectedValue, property);
        if (selectedLaborValue !== null) {
          return selectedLaborValue;
        }
      }

      const materialValue = resolver.resolveMaterialProperty(base, property);
      if (materialValue !== null) {
        return materialValue;
      }

      return resolver.resolveLaborProperty(base, property);
    },
  };
}
