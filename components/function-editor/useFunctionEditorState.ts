'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { useParameterManager } from '@/hooks/use-parameter-manager';
import { validateFormula } from '@/lib/formula-evaluator';
import {
  addParameterFromModuleField,
  buildFunctionSaveData,
  collectFunctionAutocompleteCandidates,
  FunctionFormData,
  getAvailableModuleFieldNames,
  getExistingParameterNames,
  getFormulaWithInsertedOperator,
  getFormulaWithInsertedToken,
  isFunctionEditorFormSubmittable,
  validateFunctionEditorForm,
} from '@/lib/functions/function-editor-helpers';
import type { CalculationModule, Labor, SharedFunction } from '@/lib/types';
import { labelToVariableName } from '@/lib/utils';

interface UseFunctionEditorStateOptions {
  functionId: string;
  existingFunction: SharedFunction | null;
  functions: SharedFunction[];
  labor: Labor[];
  modules: CalculationModule[];
  addFunction: (func: Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFunction: (id: string, func: Partial<SharedFunction>) => void;
  onClose: () => void;
}

export function useFunctionEditorState({
  functionId,
  existingFunction,
  functions,
  labor,
  modules,
  addFunction,
  updateFunction,
  onClose,
}: UseFunctionEditorStateOptions) {
  const isNew = functionId === 'new';
  const formulaTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [formData, setFormData] = useState<FunctionFormData>({
    displayName: existingFunction?.displayName || existingFunction?.name || '',
    name: existingFunction?.name || '',
    description: existingFunction?.description || '',
    formula: existingFunction?.formula || '',
    category: existingFunction?.category || '',
  });
  const [hasManuallyEditedVariableName, setHasManuallyEditedVariableName] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parameterErrors] = useState<Record<number, Record<string, string>>>({});
  const [formulaValidation, setFormulaValidation] = useState<{ valid: boolean; error?: string }>({
    valid: true,
  });

  useEffect(() => {
    if (formData.displayName && !hasManuallyEditedVariableName) {
      const generatedName = labelToVariableName(formData.displayName);
      if (generatedName && generatedName !== formData.name) {
        setFormData((prev) => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.displayName, formData.name, hasManuallyEditedVariableName]);

  const {
    parameters,
    expandedParameters,
    addParameter,
    updateParameter,
    removeParameter,
    toggleParameterExpanded,
    setParameters,
  } = useParameterManager({
    initialParameters: existingFunction?.parameters ?? [],
  });

  const validateFormulaInput = useCallback(
    (formulaToValidate: string) => {
      if (!formulaToValidate.trim()) {
        setFormulaValidation({ valid: true });
        return;
      }

      const paramNames = parameters.filter((param) => param.name.trim()).map((param) => param.name);
      const validation = validateFormula(formulaToValidate, paramNames, [], undefined, functions);
      setFormulaValidation(validation);
    },
    [parameters, functions]
  );

  useEffect(() => {
    validateFormulaInput(formData.formula);
  }, [formData.formula, validateFormulaInput]);

  const availableModuleFieldNames = useMemo(
    () => getAvailableModuleFieldNames(modules),
    [modules]
  );

  const existingParameterNames = useMemo(
    () => getExistingParameterNames(parameters),
    [parameters]
  );

  const addParameterFromField = useCallback(
    (fieldName: string) => {
      setParameters((prev) => addParameterFromModuleField(prev, fieldName));
    },
    [setParameters]
  );

  const collectAutocompleteCandidates = useMemo(
    () =>
      collectFunctionAutocompleteCandidates({
        parameters,
        functions,
        functionId,
        labor,
      }),
    [parameters, functions, functionId, labor]
  );

  const autocomplete = useFormulaAutocomplete({
    formula: formData.formula,
    formulaTextareaRef,
    collectAutocompleteCandidates,
    onFormulaChange: (formula) => setFormData((prev) => ({ ...prev, formula })),
  });

  const handleVariableNameChange = useCallback((newName: string) => {
    setHasManuallyEditedVariableName(true);
    setFormData((prev) => ({ ...prev, name: newName }));
  }, []);

  const handleFormDataChange = useCallback((updates: Partial<FunctionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const insertParameterAtCursor = useCallback((variableName: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const result = getFormulaWithInsertedToken({
      currentValue: textarea.value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      token: variableName,
    });

    setFormData((prev) => ({ ...prev, formula: result.value }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPosition, result.cursorPosition);
    }, 0);
  }, []);

  const insertOperatorAtCursor = useCallback((operator: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const result = getFormulaWithInsertedOperator({
      currentValue: textarea.value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      operator,
    });

    setFormData((prev) => ({ ...prev, formula: result.value }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPosition, result.cursorPosition);
    }, 0);
  }, []);

  const handleSave = useCallback(() => {
    const { errors: nextErrors, validParameters } = validateFunctionEditorForm({
      formData,
      parameters,
      formulaValidation,
      functions,
      functionId,
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const functionData = buildFunctionSaveData({ formData, validParameters });
    if (isNew) {
      addFunction(functionData);
    } else {
      updateFunction(functionId, functionData);
    }

    onClose();
  }, [
    addFunction,
    formData,
    formulaValidation,
    functionId,
    functions,
    isNew,
    onClose,
    parameters,
    updateFunction,
  ]);

  const isValid = isFunctionEditorFormSubmittable({
    formData,
    parameters,
    formulaValidation,
  });

  return {
    formData,
    errors,
    parameterErrors,
    formulaValidation,
    parameters,
    expandedParameters,
    availableModuleFieldNames,
    existingParameterNames,
    formulaTextareaRef,
    autocomplete,
    handleFormDataChange,
    handleVariableNameChange,
    addParameterFromField,
    addParameter,
    updateParameter,
    removeParameter,
    toggleParameterExpanded,
    insertParameterAtCursor,
    insertOperatorAtCursor,
    handleSave,
    isValid,
  };
}

export type FunctionEditorState = ReturnType<typeof useFunctionEditorState>;
