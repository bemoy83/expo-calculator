import { useState, useEffect, useCallback } from 'react';
import { Field, Material, ComputedOutput, CalculationModule, Labor } from '@/lib/types';
import { validateFormula, evaluateFormula } from '@/lib/formula-evaluator';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { evaluateComputedOutputs } from '@/lib/utils/evaluate-computed-outputs';

interface FormulaValidation {
  valid: boolean;
  error?: string;
  preview?: number;
}

interface UseFormulaValidationProps {
  formula: string;
  fields: Field[];
  materials: Material[];
  labor?: Labor[];
  computedOutputs?: ComputedOutput[];
}

export function useFormulaValidation({
  formula,
  fields,
  materials,
  labor = [],
  computedOutputs = [],
}: UseFormulaValidationProps) {
  const [formulaValidation, setFormulaValidation] = useState<FormulaValidation>({ valid: false });
  const functions = useFunctionsStore((state) => state.functions);

  const validateFormulaInput = useCallback((formulaToValidate: string) => {
    if (!formulaToValidate.trim()) {
      setFormulaValidation({ valid: false });
      return;
    }

    const availableVars = fields.map((f) => f.variableName).filter(Boolean);
    // Add computed outputs with 'out.' prefix to available variables
    const computedOutputVars = computedOutputs
      .filter((o) => o.variableName)
      .map((o) => `out.${o.variableName}`);
    const allAvailableVars = [...availableVars, ...computedOutputVars];
    
    // Pass field definitions for validation (needed to identify material/labor fields)
    const fieldDefinitions = fields.map(f => ({
      variableName: f.variableName,
      type: f.type,
      materialCategory: f.materialCategory,
      laborCategory: f.laborCategory,
    }));
    const validation = validateFormula(formulaToValidate, allAvailableVars, materials, fieldDefinitions, functions, labor);

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
              case 'labor':
                // For labor fields, select first available labor item in category (or any labor item)
                let candidateLabor = labor;
                if (field.laborCategory && field.laborCategory.trim()) {
                  candidateLabor = labor.filter(l => l.category === field.laborCategory);
                }
                if (candidateLabor.length > 0) {
                  defaultValues[field.variableName] = candidateLabor[0].variableName;
                } else {
                  // No labor available - use empty string (will cause error if used in formula)
                  defaultValues[field.variableName] = '';
                }
                break;
              default:
                defaultValues[field.variableName] = 1;
            }
          }
        }
      });

      // Evaluate computed outputs with default field values
      let computedValues: Record<string, number> = {};
      if (computedOutputs.length > 0) {
        // Create a temporary module-like object for evaluateComputedOutputs
        const tempModule: Partial<CalculationModule> = {
          fields,
          computedOutputs,
        };
        try {
          const computedResult = evaluateComputedOutputs(
            tempModule as CalculationModule,
            defaultValues,
            materials,
            functions
          );
          computedValues = computedResult.computedValues;
        } catch (error) {
          // If computed outputs fail to evaluate, use 0 as fallback
          computedOutputs.forEach((output) => {
            if (output.variableName) {
              computedValues[`out.${output.variableName}`] = 0;
            }
          });
        }
      }

      // Merge computed values into default values
      const valuesWithComputed = {
        ...defaultValues,
        ...computedValues,
      };

      try {
        const preview = evaluateFormula(formulaToValidate, {
          fieldValues: valuesWithComputed,
          materials,
          labor,
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
  }, [fields, materials, labor, functions, computedOutputs]);

  useEffect(() => {
    if (formula) {
      validateFormulaInput(formula);
    } else {
      setFormulaValidation({ valid: false });
    }
  }, [formula, fields, materials, labor, computedOutputs, validateFormulaInput]);

  return {
    formulaValidation,
    validateFormula: validateFormulaInput,
  };
}

