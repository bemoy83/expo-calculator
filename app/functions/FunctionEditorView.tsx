'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { SharedFunction } from '@/lib/types';
import { validateFormula } from '@/lib/formula-evaluator';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { useParameterManager } from '@/hooks/use-parameter-manager';
import { FunctionDetailsCard } from '@/components/function-editor/FunctionDetailsCard';
import { ParametersManager } from '@/components/function-editor/ParametersManager';
import { FunctionFormulaCard } from '@/components/function-editor/FunctionFormulaCard';
import { FunctionEditorHeader } from '@/components/function-editor/FunctionEditorHeader';
import { FunctionEditorActions } from '@/components/function-editor/FunctionEditorActions';
import { labelToVariableName } from '@/lib/utils';
import { X } from 'lucide-react';

interface AutocompleteCandidate {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
  functionSignature?: string;
}

export interface FunctionEditorViewProps {
  functionId: string; // 'new' or existing function ID
  onClose: () => void;
}

export function FunctionEditorView({ functionId, onClose }: FunctionEditorViewProps) {
  const isNew = functionId === 'new';
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const updateFunction = useFunctionsStore((state) => state.updateFunction);
  const getFunction = useFunctionsStore((state) => state.getFunction);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);

  const existingFunction = isNew ? null : getFunction(functionId);
  const formulaTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [formData, setFormData] = useState({
    displayName: existingFunction?.displayName || existingFunction?.name || '',
    name: existingFunction?.name || '',
    description: existingFunction?.description || '',
    formula: existingFunction?.formula || '',
    category: existingFunction?.category || '',
  });

  // Track if user has manually edited the variable name
  const [hasManuallyEditedVariableName, setHasManuallyEditedVariableName] = useState(false);

  // Auto-generate variable name from display name when display name changes
  // Only auto-generate if:
  // 1. Creating a new function, OR
  // 2. User hasn't manually edited the variable name
  useEffect(() => {
    if (formData.displayName && !hasManuallyEditedVariableName) {
      const generatedName = labelToVariableName(formData.displayName);
      if (generatedName && generatedName !== formData.name) {
        setFormData((prev) => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.displayName, formData.name, hasManuallyEditedVariableName]);

  // Track manual edits to variable name
  const handleVariableNameChange = useCallback((newName: string) => {
    setHasManuallyEditedVariableName(true);
    setFormData((prev) => ({ ...prev, name: newName }));
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parameterErrors, setParameterErrors] = useState<Record<number, Record<string, string>>>({});
  const [formulaValidation, setFormulaValidation] = useState<{ valid: boolean; error?: string }>({
    valid: true,
  });

  // Parameter management hook
  const {
    parameters,
    expandedParameters,
    addParameter,
    updateParameter,
    removeParameter,
    toggleParameterExpanded,
    setParameters,
  } = useParameterManager({
    initialParameters: existingFunction?.parameters || [
      { name: '', label: '', unitCategory: undefined, unitSymbol: undefined, required: true },
    ],
    onParameterChange: () => {
      // Re-validate formula when parameters change
      if (formData.formula) {
        validateFormulaInput(formData.formula);
      }
    },
  });

  // Collect autocomplete candidates for function formulas
  // Includes: valid parameters, other functions, built-in math functions, constants
  const collectAutocompleteCandidates = useMemo<AutocompleteCandidate[]>(() => {
    const candidates: AutocompleteCandidate[] = [];

    // Parameter names (the function's own parameters)
    // Filter to only include valid, unique parameters
    const validParamNames = new Set<string>();
    parameters.forEach((param) => {
      const trimmedName = param.name.trim();

      // Exclude if:
      // 1. Name is empty
      // 2. Invalid identifier pattern (must start with letter/underscore, only alphanumeric/underscore)
      // 3. Already added (duplicate)
      if (
        trimmedName &&
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName) &&
        !validParamNames.has(trimmedName.toLowerCase())
      ) {
        validParamNames.add(trimmedName.toLowerCase());

        const unitDisplay = param.unitSymbol ? ` (${param.unitSymbol})` : '';
        candidates.push({
          name: trimmedName,
          displayName: `${trimmedName}${unitDisplay}`,
          type: 'field', // Treat as field type for autocomplete
          description: param.label || param.name,
        });
      }
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

    // Other user-defined functions (for nested function calls)
    // Exclude the current function being edited to prevent self-reference
    // Only include functions with valid names
    functions.forEach((func) => {
      if (
        func.id !== functionId &&
        func.name.trim() &&
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(func.name.trim())
      ) {
        const paramNames = func.parameters
          .filter((p) => p.name.trim() && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.name.trim()))
          .map((p) => p.name.trim())
          .join(', ');

        candidates.push({
          name: func.name.trim(),
          displayName: `${func.name.trim()}(${paramNames})`,
          type: 'function',
          description: func.description || `User-defined function: ${func.formula}`,
          functionSignature: paramNames,
        });
      }
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
  }, [parameters, functions, functionId]);

  // Formula autocomplete hook
  const {
    autocompleteSuggestions,
    selectedSuggestionIndex,
    isAutocompleteOpen,
    autocompletePosition,
    currentWord,
    recentlyUsedVariables,
    insertSuggestion,
    handleAutocompleteKeyDown,
    updateAutocompleteSuggestionsFinal,
    setSelectedSuggestionIndex,
    setIsAutocompleteOpen,
  } = useFormulaAutocomplete({
    formula: formData.formula,
    formulaTextareaRef,
    collectAutocompleteCandidates,
    onFormulaChange: (formula) => setFormData({ ...formData, formula }),
  });

  // Validate formula when it changes
  const validateFormulaInput = useCallback(
    (formulaToValidate: string) => {
      if (!formulaToValidate.trim()) {
        setFormulaValidation({ valid: true });
        return;
      }

      // Get parameter names for validation
      const paramNames = parameters.filter((p) => p.name.trim()).map((p) => p.name);

      const validation = validateFormula(
        formulaToValidate,
        paramNames,
        [], // No materials in function formulas
        undefined, // No fields
        functions // Allow nested functions
      );

      setFormulaValidation(validation);
    },
    [parameters, functions]
  );

  useEffect(() => {
    validateFormulaInput(formData.formula);
  }, [formData.formula, validateFormulaInput]);

  const handleSave = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Function display name is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Function variable name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name.trim())) {
      newErrors.name = 'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores';
    }

    // Check for duplicate variable names
    const duplicate = functions.find(
      (f) => f.name.toLowerCase() === formData.name.toLowerCase().trim() && f.id !== functionId
    );
    if (duplicate) {
      newErrors.name = 'A function with this variable name already exists';
    }

    // Validate parameters
    const validParameters = parameters.filter((p) => p.name.trim() && p.label.trim());
    if (validParameters.length === 0) {
      newErrors.parameters = 'At least one parameter is required';
    }

    // Check for duplicate parameter names
    const paramNames = validParameters.map((p) => p.name.toLowerCase());
    const duplicateParams = paramNames.filter((name, index) => paramNames.indexOf(name) !== index);
    if (duplicateParams.length > 0) {
      newErrors.parameters = `Duplicate parameter names: ${duplicateParams.join(', ')}`;
    }

    if (!formData.formula.trim()) {
      newErrors.formula = 'Formula is required';
    } else if (!formulaValidation.valid) {
      newErrors.formula = formulaValidation.error || 'Invalid formula';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const functionData: Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'> = {
      displayName: formData.displayName.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      formula: formData.formula.trim(),
      parameters: validParameters.map((p) => ({
        name: p.name.trim(),
        label: p.label.trim(),
        unitCategory: p.unitCategory,
        unitSymbol: p.unitSymbol,
        required: p.required !== false,
      })),
      category: formData.category.trim() || undefined,
    };

    if (isNew) {
      addFunction(functionData);
    } else {
      updateFunction(functionId, functionData);
    }

    onClose();
  }, [
    formData,
    parameters,
    formulaValidation,
    functions,
    functionId,
    isNew,
    addFunction,
    updateFunction,
    onClose,
  ]);

  // Check if form is valid for submission
  const isValid =
    formData.displayName.trim() !== '' &&
    formData.name.trim() !== '' &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name.trim()) &&
    formData.formula.trim() !== '' &&
    formulaValidation.valid &&
    parameters.some((p) => p.name.trim() && p.label.trim());

  return (
    <Layout>
      <FunctionEditorHeader functionId={functionId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          <FunctionDetailsCard
            formData={formData}
            errors={errors}
            onFormDataChange={(updates) => setFormData({ ...formData, ...updates })}
            onVariableNameChange={handleVariableNameChange}
            getAllCategories={getAllCategories}
            addCategory={addCategory}
          />

          <ParametersManager
            parameters={parameters}
            expandedParameters={expandedParameters}
            parameterErrors={parameterErrors}
            onToggleExpanded={toggleParameterExpanded}
            onUpdateParameter={updateParameter}
            onRemoveParameter={removeParameter}
            onAddParameter={addParameter}
          />

          {errors.parameters && <p className="text-sm text-destructive">{errors.parameters}</p>}
        </div>

        <div className="lg:col-span-1">
          <FunctionFormulaCard
            formula={formData.formula}
            onFormulaChange={(formula) => setFormData({ ...formData, formula })}
            formulaTextareaRef={formulaTextareaRef}
            formulaValidation={formulaValidation}
            formulaError={errors.formula}
            autocompleteSuggestions={autocompleteSuggestions}
            selectedSuggestionIndex={selectedSuggestionIndex}
            isAutocompleteOpen={isAutocompleteOpen}
            autocompletePosition={autocompletePosition}
            currentWord={currentWord}
            recentlyUsedVariables={recentlyUsedVariables}
            insertSuggestion={insertSuggestion}
            handleAutocompleteKeyDown={handleAutocompleteKeyDown}
            updateAutocompleteSuggestionsFinal={updateAutocompleteSuggestionsFinal}
            setSelectedSuggestionIndex={setSelectedSuggestionIndex}
            setIsAutocompleteOpen={setIsAutocompleteOpen}
          />
        </div>
      </div>

      <FunctionEditorActions functionId={functionId} isValid={isValid} onCancel={onClose} onSubmit={handleSave} />
    </Layout>
  );
}
