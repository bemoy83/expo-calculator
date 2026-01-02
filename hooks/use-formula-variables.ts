import { useMemo, useCallback } from 'react';
import { Field, Material } from '@/lib/types';
import { useFunctionsStore } from '@/lib/stores/functions-store';

interface FieldVariable {
  name: string;
  label: string;
  type: string;
  required: boolean;
  materialCategory?: string;
}

interface MaterialVariable {
  name: string;
  label: string;
  price: number;
  unit: string;
  properties: Array<{ id: string; name: string; unit?: string; unitSymbol?: string; type: string }>;
}

interface AutocompleteCandidate {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
  functionSignature?: string; // For user-defined functions: parameter names
}

interface UseFormulaVariablesProps {
  fields: Field[];
  materials: Material[];
  formula: string;
}

export function useFormulaVariables({
  fields,
  materials,
  formula,
}: UseFormulaVariablesProps) {
  const functions = useFunctionsStore((state) => state.functions);

  const getFormulaTokens = (formulaText: string): string[] => {
    // Matches identifiers like: width, sheet.width, area1, sheet_width, etc.
    return formulaText.match(/[A-Za-z0-9_.]+/g) ?? [];
  };

  const isVariableInFormula = useCallback(
    (variableName: string, formulaText: string): boolean => {
      if (!formulaText || !variableName) return false;

      const tokens = getFormulaTokens(formulaText);
      return tokens.includes(variableName);
    },
    []
  );

  const isPropertyReferenceInFormula = useCallback(
    (materialVar: string, propertyName: string, formulaText: string): boolean => {
      if (!formulaText || !materialVar || !propertyName) return false;

      const propertyRef = `${materialVar}.${propertyName}`;
      const tokens = getFormulaTokens(formulaText);
      return tokens.includes(propertyRef);
    },
    []
  );

  // Get available properties for material fields
  const getMaterialFieldProperties = useCallback((fieldVar: string) => {
    const field = fields.find(f => f.variableName === fieldVar);
    if (!field || field.type !== 'material') {
      return [];
    }
    
    // Get materials in the field's category (if specified)
    let candidateMaterials = materials;
    if (field.materialCategory && field.materialCategory.trim()) {
      candidateMaterials = materials.filter(m => m.category === field.materialCategory);
    }
    
    // Collect all unique properties from candidate materials
    const propertyMap = new Map<string, { name: string; unit?: string; unitSymbol?: string; type: string }>();
    candidateMaterials.forEach(material => {
      if (material.properties) {
        material.properties.forEach(prop => {
          if (!propertyMap.has(prop.name)) {
            propertyMap.set(prop.name, {
              name: prop.name,
              unit: prop.unit,
              unitSymbol: prop.unitSymbol,
              type: prop.type,
            });
          }
        });
      }
    });
    
    return Array.from(propertyMap.values());
  }, [fields, materials]);

  // Available field variables
  const availableFieldVariables = useMemo<FieldVariable[]>(() => {
    return fields
      .map((f) => f.variableName)
      .filter(Boolean)
      .map((varName) => {
        const field = fields.find((f) => f.variableName === varName);
        return {
          name: varName,
          label: field?.label || varName,
          type: field?.type || 'unknown',
          required: field?.required || false,
          materialCategory: field?.materialCategory,
        };
      });
  }, [fields]);

  // Available material variables
  const availableMaterialVariables = useMemo<MaterialVariable[]>(() => {
    return materials.map((m) => ({
      name: m.variableName,
      label: m.name,
      price: m.price,
      unit: m.unit,
      properties: (m.properties || []).map((prop, index) => ({
        id: prop.id || `${m.variableName}-prop-${index}`,
        name: prop.name,
        unit: prop.unit,
        unitSymbol: prop.unitSymbol,
        type: prop.type,
      })),
    }));
  }, [materials]);

  // Calculate used fields for progress counter
  const usedFields = useMemo(() => {
    return availableFieldVariables.filter(
      (v) => isVariableInFormula(v.name, formula)
    ).length;
  }, [availableFieldVariables, formula, isVariableInFormula]);

  // Required fields for visual indicators
  const requiredFields = useMemo(() => {
    return availableFieldVariables.filter((v) => v.required);
  }, [availableFieldVariables]);

  // Collect all available autocomplete candidates
  const collectAutocompleteCandidates = useMemo<AutocompleteCandidate[]>(() => {
    const candidates: AutocompleteCandidate[] = [];

    // Field variables
    availableFieldVariables.forEach((fieldVar) => {
      candidates.push({
        name: fieldVar.name,
        displayName: fieldVar.name,
        type: 'field',
        description: fieldVar.label !== fieldVar.name ? fieldVar.label : undefined,
      });

      // If it's a material field, add its properties
      if (fieldVar.type === 'material') {
        const fieldProperties = getMaterialFieldProperties(fieldVar.name);
        fieldProperties.forEach((prop) => {
          const unitDisplay = prop.unitSymbol || prop.unit;
          candidates.push({
            name: `${fieldVar.name}.${prop.name}`,
            displayName: `${fieldVar.name}.${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''}`,
            type: 'property',
            description: prop.name,
          });
        });
      }
    });

    // Material variables
    availableMaterialVariables.forEach((mat) => {
      candidates.push({
        name: mat.name,
        displayName: mat.name,
        type: 'material',
        description: mat.label,
      });

      // Material properties
      mat.properties.forEach((prop) => {
        const unitDisplay = prop.unitSymbol || prop.unit;
        candidates.push({
          name: `${mat.name}.${prop.name}`,
          displayName: `${mat.name}.${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''}`,
          type: 'property',
          description: prop.name,
        });
      });
    });

    // Built-in math functions
    const mathFunctions = [
      { name: 'sqrt', displayName: 'sqrt()', description: 'Square root' },
      { name: 'round', displayName: 'round()', description: 'Round to nearest integer' },
      { name: 'ceil', displayName: 'ceil()', description: 'Round up' },
      { name: 'floor', displayName: 'floor()', description: 'Round down' },
      { name: 'abs', displayName: 'abs()', description: 'Absolute value' },
      { name: 'max', displayName: 'max()', description: 'Maximum value' },
      { name: 'min', displayName: 'min()', description: 'Minimum value' },
    ];
    mathFunctions.forEach((fn) => {
      candidates.push({
        name: fn.name,
        displayName: fn.displayName,
        type: 'function',
        description: fn.description,
      });
    });

    // User-defined shared functions
    functions.forEach((func) => {
      const paramNames = func.parameters.map(p => p.name).join(', ');
      candidates.push({
        name: func.name,
        displayName: `${func.name}(${paramNames})`,
        type: 'function',
        description: func.description || `User-defined function: ${func.formula}`,
        functionSignature: paramNames, // Store parameter names for insertion
      });
    });

    // Constants
    const constants = [
      { name: 'pi', displayName: 'pi', description: 'Pi (3.14159...)' },
      { name: 'e', displayName: 'e', description: 'Euler\'s number (2.71828...)' },
    ];
    constants.forEach((const_) => {
      candidates.push({
        name: const_.name,
        displayName: const_.displayName,
        type: 'constant',
        description: const_.description,
      });
    });

    return candidates;
  }, [availableFieldVariables, availableMaterialVariables, getMaterialFieldProperties, functions]);

  return {
    // Helper functions
    isVariableInFormula,
    isPropertyReferenceInFormula,
    getMaterialFieldProperties,
    
    // Variable collections
    availableFieldVariables,
    availableMaterialVariables,
    collectAutocompleteCandidates,
    
    // Computed values
    usedFields,
    requiredFields,
    allFields: availableFieldVariables, // Alias for compatibility
  };
}
