import { Material } from '../types';
import { UnitCategory, divideUnits, getUnitCategory } from '../units';
import { FormulaField } from './validation-types';

function getPropertyUnitCategory(property?: { unitCategory?: UnitCategory; unitSymbol?: string }): UnitCategory | undefined {
  return property?.unitCategory || (property?.unitSymbol ? getUnitCategory(property.unitSymbol) : undefined);
}

export function validateUnitCompatibility(
  formula: string,
  fieldPropertyRefs: Array<{ fieldVar: string; propertyName: string; fullMatch: string }>,
  materialPropertyRefs: Array<{ materialVar: string; propertyName: string; fullMatch: string }>,
  availableVariables: string[],
  materials: Material[],
  fields?: FormulaField[]
): string | null {
  const variableUnits = new Map<string, UnitCategory>();
  const fieldsByVariableName = new Map((fields ?? []).map(field => [field.variableName, field]));
  const materialsByVariableName = new Map(materials.map(material => [material.variableName, material]));

  for (const ref of fieldPropertyRefs) {
    const field = fieldsByVariableName.get(ref.fieldVar);
    if (field && field.type === 'material') {
      let candidateMaterials = materials;
      if (field.materialCategory && field.materialCategory.trim()) {
        candidateMaterials = materials.filter(m => m.category === field.materialCategory);
      }

      for (const material of candidateMaterials) {
        const property = material.properties?.find(p => p.name === ref.propertyName);
        const unitCat = getPropertyUnitCategory(property);
        if (unitCat) {
          variableUnits.set(ref.fullMatch, unitCat);
          break;
        }
      }
    }
  }

  for (const ref of materialPropertyRefs) {
    const material = materialsByVariableName.get(ref.materialVar);
    if (material) {
      const property = material.properties?.find(p => p.name === ref.propertyName);
      const unitCat = getPropertyUnitCategory(property);
      if (unitCat) {
        variableUnits.set(ref.fullMatch, unitCat);
      }
    }
  }

  for (const varName of availableVariables) {
    const field = fieldsByVariableName.get(varName);
    if (field && (
      field.type === 'number' ||
      (field.type === 'dropdown' && field.dropdownMode === 'numeric')
    )) {
      const unitCat = getPropertyUnitCategory(field);
      if (unitCat) {
        variableUnits.set(varName, unitCat);
      }
    }
  }

  const addSubPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g;
  let match;
  while ((match = addSubPattern.exec(formula)) !== null) {
    const var1 = match[1];
    const var2 = match[3];
    const unit1 = variableUnits.get(var1);
    const unit2 = variableUnits.get(var2);

    if (unit1 && unit2 && unit1 !== unit2) {
      if (unit1 !== 'count' && unit1 !== 'percentage' && unit2 !== 'count' && unit2 !== 'percentage') {
        return `Cannot ${match[2] === '+' ? 'add' : 'subtract'} ${unit1} (${var1}) to ${unit2} (${var2})`;
      }
    }
  }

  const divPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\/\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g;
  while ((match = divPattern.exec(formula)) !== null) {
    const var1 = match[1];
    const var2 = match[2];
    const unit1 = variableUnits.get(var1);
    const unit2 = variableUnits.get(var2);

    if (unit1 && unit2) {
      const resultUnit = divideUnits(unit1, unit2);
      if (resultUnit === null) {
        if ((unit1 === 'count' || unit1 === 'percentage') && unit2 !== 'count' && unit2 !== 'percentage') {
          return `Cannot divide unitless (${var1}) by ${unit2} (${var2})`;
        }
        if (unit1 !== unit2 && unit1 !== 'count' && unit1 !== 'percentage' && unit2 !== 'count' && unit2 !== 'percentage') {
          return `Cannot divide ${unit1} (${var1}) by ${unit2} (${var2})`;
        }
      }
    }
  }

  return null;
}
