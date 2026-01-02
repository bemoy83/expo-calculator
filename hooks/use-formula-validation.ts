import { useState, useEffect, useCallback } from 'react';
import { Field, Material } from '@/lib/types';
import { validateFormula, evaluateFormula } from '@/lib/formula-evaluator';
import { useFunctionsStore } from '@/lib/stores/functions-store';

interface FormulaValidation {
  valid: boolean;
  error?: string;
  preview?: number;
}

interface UseFormulaValidationProps {
  formula: string;
  fields: Field[];
  materials: Material[];
}

export function useFormulaValidation({
  formula,
  fields,
  materials,
}: UseFormulaValidationProps) {
  const [formulaValidation, setFormulaValidation] = useState<FormulaValidation>({ valid: false });
  const functions = useFunctionsStore((state) => state.functions);

  const validateFormulaInput = useCallback((formulaToValidate: string) => {
    if (!formulaToValidate.trim()) {
      setFormulaValidation({ valid: false });
      return;
    }

    const availableVars = fields.map((f) => f.variableName).filter(Boolean);
    // Pass field definitions for validation (needed to identify material fields)
    const fieldDefinitions = fields.map(f => ({
      variableName: f.variableName,
      type: f.type,
      materialCategory: f.materialCategory,
    }));
    const validation = validateFormula(formulaToValidate, availableVars, materials, fieldDefinitions, functions);

    if (validation.valid) {
      // Calculate preview with default values
      const defaultValues: Record<string, string | number | boolean> = {};
      fields.forEach(field => {
        if (field.variableName) {
          if (field.defaultValue !== undefined) {
            defaultValues[field.variableName] = field.defaultValue;
          } else {
            switch (field.type) {
              case 'number':
                defaultValues[field.variableName] = 1;
                break;
              case 'boolean':
                defaultValues[field.variableName] = true;
                break;
              case 'material':
                // For material fields, select first available material in category (or any material)
                let candidateMaterials = materials;
                if (field.materialCategory && field.materialCategory.trim()) {
                  candidateMaterials = materials.filter(m => m.category === field.materialCategory);
                }
                if (candidateMaterials.length > 0) {
                  defaultValues[field.variableName] = candidateMaterials[0].variableName;
                } else {
                  // No material available - use empty string (will cause error if used in formula)
                  defaultValues[field.variableName] = '';
                }
                break;
              default:
                defaultValues[field.variableName] = 1;
            }
          }
        }
      });

      try {
        const preview = evaluateFormula(formulaToValidate, {
          fieldValues: defaultValues,
          materials,
          functions,
        });
        setFormulaValidation({ valid: true, preview });
      } catch (error: any) {
        // If evaluation fails, show the error
        setFormulaValidation({ 
          valid: false, 
          error: error.message || 'Formula evaluation failed' 
        });
      }
    } else {
      setFormulaValidation({ valid: false, error: validation.error });
    }
  }, [fields, materials, functions]);

  useEffect(() => {
    if (formula) {
      validateFormulaInput(formula);
    } else {
      setFormulaValidation({ valid: false });
    }
  }, [formula, fields, materials, validateFormulaInput]);

  return {
    formulaValidation,
    validateFormula: validateFormulaInput,
  };
}

