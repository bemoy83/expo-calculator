import { useState, useEffect } from 'react';
import { Field, Material, ComputedOutput, CalculationModule } from '@/lib/types';
import { evaluateFormula, analyzeFormulaVariables } from '@/lib/formula-evaluator';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { evaluateComputedOutputs } from '@/lib/utils/evaluate-computed-outputs';

interface UsePreviewCostProps {
  showPreview: boolean;
  formula: string;
  fields: Field[];
  materials: Material[];
  previewFieldValues: Record<string, string | number | boolean>;
  formulaValidationValid: boolean;
  computedOutputs?: ComputedOutput[];
}

export function usePreviewCost({
  showPreview,
  formula,
  fields,
  materials,
  previewFieldValues,
  formulaValidationValid,
  computedOutputs = [],
}: UsePreviewCostProps) {
  const [previewCalculatedCost, setPreviewCalculatedCost] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const functions = useFunctionsStore((state) => state.functions);

  useEffect(() => {
    if (!showPreview || !formula || !formulaValidationValid) {
      setPreviewCalculatedCost(0);
      setPreviewError(null);
      return;
    }

    try {
      // Check if required fields are missing
      const missingFields = fields
        .filter(f => f.required && f.variableName && (
          previewFieldValues[f.variableName] === undefined ||
          previewFieldValues[f.variableName] === '' ||
          previewFieldValues[f.variableName] === null
        ))
        .map(f => f.label);

      if (missingFields.length > 0) {
        setPreviewError('⚠️ Cannot calculate yet — missing inputs.');
        setPreviewCalculatedCost(0);
        return;
      }

      // Check if material is needed for property formulas
      const availableVars = fields.map((f) => f.variableName).filter(Boolean);
      // Add computed outputs to available variables for analysis
      const computedOutputVars = computedOutputs
        .filter((o) => o.variableName)
        .map((o) => `out.${o.variableName}`);
      const allAvailableVars = [...availableVars, ...computedOutputVars];
      
      const formulaVars = analyzeFormulaVariables(formula, allAvailableVars, materials, fields.map(f => ({
        variableName: f.variableName,
        type: f.type,
        materialCategory: f.materialCategory,
      })), functions);
      const materialFields = fields.filter(f => f.type === 'material');
      const hasMaterialProperties = formulaVars.materialPropertyRefs.length > 0;
      
      if (hasMaterialProperties) {
        const materialVarsInFormula = new Set(formulaVars.materialPropertyRefs.map(ref => ref.materialVar));
        const missingMaterials = Array.from(materialVarsInFormula).filter(matVar => {
          // Check if any material field has this variable name set
          return !materialFields.some(f => previewFieldValues[f.variableName] === matVar);
        });

        if (missingMaterials.length > 0) {
          setPreviewError('⚠️ Select a material to continue.');
          setPreviewCalculatedCost(0);
          return;
        }
      }

      // Evaluate computed outputs first (if any)
      let valuesWithComputed = { ...previewFieldValues };
      if (computedOutputs.length > 0) {
        // Create a temporary module-like object for evaluateComputedOutputs
        const tempModule: Partial<CalculationModule> = {
          fields,
          computedOutputs,
        };
        try {
          const computedResult = evaluateComputedOutputs(
            tempModule as CalculationModule,
            previewFieldValues,
            materials,
            functions
          );
          // Merge computed values into preview values
          valuesWithComputed = {
            ...previewFieldValues,
            ...computedResult.computedValues,
          };
        } catch (error) {
          // If computed outputs fail, continue with regular field values
          // The formula evaluation will handle the error
        }
      }

      const result = evaluateFormula(formula, {
        fieldValues: valuesWithComputed,
        materials,
        fields: fields.map(f => ({
          variableName: f.variableName,
          type: f.type,
          materialCategory: f.materialCategory,
        })),
        functions,
      });
      setPreviewCalculatedCost(result);
      setPreviewError(null);
    } catch (error: any) {
      // Calculation failed - show friendly error
      setPreviewError('⚠️ Cannot calculate yet — missing inputs.');
      setPreviewCalculatedCost(0);
    }
  }, [showPreview, formula, previewFieldValues, materials, fields, formulaValidationValid, functions, computedOutputs]);

  return {
    previewCalculatedCost,
    previewError,
  };
}








