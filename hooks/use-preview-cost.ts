import { useState, useEffect } from 'react';
import { Field, Material } from '@/lib/types';
import { evaluateFormula, analyzeFormulaVariables } from '@/lib/formula-evaluator';

interface UsePreviewCostProps {
  showPreview: boolean;
  formula: string;
  fields: Field[];
  materials: Material[];
  previewFieldValues: Record<string, string | number | boolean>;
  formulaValidationValid: boolean;
}

export function usePreviewCost({
  showPreview,
  formula,
  fields,
  materials,
  previewFieldValues,
  formulaValidationValid,
}: UsePreviewCostProps) {
  const [previewCalculatedCost, setPreviewCalculatedCost] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      const formulaVars = analyzeFormulaVariables(formula, availableVars, materials, fields.map(f => ({
        variableName: f.variableName,
        type: f.type,
        materialCategory: f.materialCategory,
      })));
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

      const result = evaluateFormula(formula, {
        fieldValues: previewFieldValues,
        materials,
        fields: fields.map(f => ({
          variableName: f.variableName,
          type: f.type,
          materialCategory: f.materialCategory,
        })),
      });
      setPreviewCalculatedCost(result);
      setPreviewError(null);
    } catch (error: any) {
      // Calculation failed - show friendly error
      setPreviewError('⚠️ Cannot calculate yet — missing inputs.');
      setPreviewCalculatedCost(0);
    }
  }, [showPreview, formula, previewFieldValues, materials, fields, formulaValidationValid]);

  return {
    previewCalculatedCost,
    previewError,
  };
}


