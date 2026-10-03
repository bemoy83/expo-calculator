'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParameterManager } from '@/hooks/use-parameter-manager';
import { validateFormula } from '@/lib/formula-evaluator';
import type { FormulaErrorKind } from '@/lib/formula/validator';
import {
  addSuggestedParameter,
  buildFunctionSaveData,
  collectFunctionAutocompleteCandidates,
  findUnknownMaterialProperties,
  getPropertyCandidatesForBase,
  FunctionFormData,
  getParameterSuggestions,
  storedParameterKey,
  type ParameterSuggestion,
  getExistingParameterNames,
  isFunctionEditorFormSubmittable,
  validateFunctionEditorForm,
} from '@/lib/functions/function-editor-helpers';
import type { Calculator } from '@/lib/calculator/types';
import type { Labor, Material, SharedFunction } from '@/lib/types';

type FunctionParameter = SharedFunction['parameters'][number];
import { labelToVariableName } from '@/lib/utils';
import { countParameterUses } from '@/lib/functions/function-usage';
import { categoryForName, getMaterialCategories } from '@/lib/utils/material-category';
import { labelFromName } from '@/lib/utils/function-parameters';

interface UseFunctionEditorStateOptions {
  functionId: string;
  existingFunction: SharedFunction | null;
  functions: SharedFunction[];
  labor: Labor[];
  /** The catalog, whose property names a material parameter offers after the dot. */
  materials: Material[];
  /** Calculators, whose inputs are offered as parameters after the other functions' parameters. */
  calculators: Calculator[];
  addFunction: (func: Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFunction: (id: string, func: Partial<SharedFunction>) => void;
}

export function useFunctionEditorState({
  functionId,
  existingFunction,
  functions,
  labor,
  materials,
  calculators,
  addFunction,
  updateFunction,
}: UseFunctionEditorStateOptions) {
  const isNew = functionId === 'new';
  const [formData, setFormData] = useState<FunctionFormData>({
    displayName: existingFunction?.displayName || existingFunction?.name || '',
    name: existingFunction?.name || '',
    description: existingFunction?.description || '',
    formula: existingFunction?.formula || '',
    category: existingFunction?.category || '',
  });
  // The call name follows the display name only while creating. For a saved function it's
  // the name formulas call, so it must never change as a side effect of a label edit.
  const [hasManuallyEditedVariableName, setHasManuallyEditedVariableName] = useState(!!existingFunction);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parameterErrors] = useState<Record<number, Record<string, string>>>({});
  const [formulaValidation, setFormulaValidation] = useState<{ valid: boolean; error?: string; errorKind?: FormulaErrorKind; /** an error is on its way, held back while the formula is still being typed */ pending?: boolean; /** what the check said before the pending one, for the header to keep showing */ wasValid?: boolean }>({
    valid: true,
  });
  const validatedOnce = useRef(false);

  // A save attempt's formula error goes stale as soon as the formula is edited; from then
  // on the live check (formulaValidation) reports its state.
  useEffect(() => {
    setErrors((prev) => {
      if (!prev.formula) return prev;
      const next = { ...prev };
      delete next.formula;
      return next;
    });
  }, [formData.formula]);

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
    isNameInUse: (name) => countParameterUses(formData.formula, name) > 0,
  });

  // A valid formula shows at once; an error waits until it has stood for a moment, so a
  // half-typed formula isn't flagged mid-keystroke. The first check, on opening, doesn't wait.
  useEffect(() => {
    if (!formData.formula.trim()) {
      setFormulaValidation({ valid: true });
      validatedOnce.current = true;
      return;
    }
    const paramNames = parameters.filter((param) => param.name.trim()).map((param) => param.name);
    const validation = validateFormula(formData.formula, paramNames, [], functions);
    if (validation.valid || !validatedOnce.current) {
      validatedOnce.current = true;
      setFormulaValidation(validation);
      return;
    }
    setFormulaValidation((prev) => ({ valid: false, pending: true, wasValid: prev.pending ? prev.wasValid : prev.valid }));
    const timer = setTimeout(() => setFormulaValidation(validation), 700);
    return () => clearTimeout(timer);
  }, [formData.formula, parameters, functions]);

  const parameterSuggestions = useMemo(
    () => getParameterSuggestions(functions, calculators, existingFunction?.id),
    [functions, calculators, existingFunction?.id]
  );

  const existingParameterNames = useMemo(
    () => getExistingParameterNames(parameters),
    [parameters]
  );

  const addParameterFromSuggestion = useCallback(
    (suggestion: ParameterSuggestion) => {
      setParameters((prev) => addSuggestedParameter(prev, suggestion));
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
        stored: parameterSuggestions,
      }),
    [parameters, functions, functionId, labor, parameterSuggestions]
  );

  // Likely property typos (`board.widht`), shown once the formula has stood for a moment.
  const [propertyHint, setPropertyHint] = useState<string | undefined>();
  useEffect(() => {
    const unknown = findUnknownMaterialProperties({ formula: formData.formula, parameters, materials });
    if (unknown.length === 0) {
      setPropertyHint(undefined);
      return;
    }
    const timer = setTimeout(
      () =>
        setPropertyHint(
          unknown
            .slice(0, 3)
            .map(({ reference, suggestion }) =>
              suggestion ? `No material has “${reference}”. Did you mean “${reference.split('.')[0]}.${suggestion}”?` : `No material has “${reference}”.`
            )
            .join(' ')
        ),
      700
    );
    return () => clearTimeout(timer);
  }, [formData.formula, parameters, materials]);

  // What follows `base.`, asked for as it is typed, so a name that isn't declared yet can still offer its properties.
  const candidatesForBase = useCallback(
    (base: string) => getPropertyCandidatesForBase({ base, parameters, materials, labor, functions }),
    [parameters, materials, labor, functions]
  );

  // Picking a stored parameter from the suggestions adds it, with its unit and label.
  const handleSuggestionInserted = useCallback(
    (suggestion: { storedKey?: string }) => {
      const stored = suggestion.storedKey ? parameterSuggestions.find((item) => storedParameterKey(item) === suggestion.storedKey) : undefined;
      if (stored) setParameters((prev) => addSuggestedParameter(prev, stored));
    },
    [parameterSuggestions, setParameters]
  );


  const handleVariableNameChange = useCallback((newName: string) => {
    setHasManuallyEditedVariableName(true);
    setFormData((prev) => ({ ...prev, name: newName }));
  }, []);

  const handleFormDataChange = useCallback((updates: Partial<FunctionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // What a parameter made from a name in the formula starts as.
  const buildNamedParameter = useCallback(
    (name: string): FunctionParameter => {
      // A name the formula reads properties from (`board.width`) can only be a material.
      const isMaterial = formData.formula.includes(`${name}.`);
      // and a name that is a category (`sheets`) starts out limited to it.
      const materialCategory = isMaterial ? categoryForName(name, getMaterialCategories(materials)) : undefined;
      return {
        name,
        label: labelFromName(name),
        required: true,
        ...(isMaterial ? { kind: 'material' as const, ...(materialCategory ? { materialCategory } : {}) } : {}),
      };
    },
    [formData.formula, materials]
  );

  // "+ Create parameter" for a name the formula uses but no parameter has yet.
  // Returns the parameter it added, or null if there already is one by that name.
  const addParameterNamed = useCallback(
    (name: string): FunctionParameter | null => {
      if (parameters.some((param) => param.name === name)) return null;
      const added = buildNamedParameter(name);
      setParameters((prev) => (prev.some((param) => param.name === name) ? prev : [...prev, added]));
      return added;
    },
    [setParameters, parameters, buildNamedParameter]
  );

  // The same for several names at once, in the order given. Returns what it added.
  const addParametersNamed = useCallback(
    (names: string[]): FunctionParameter[] => {
      const added = names.filter((name) => !parameters.some((param) => param.name === name)).map(buildNamedParameter);
      if (added.length === 0) return [];
      setParameters((prev) => [...prev, ...added.filter((param) => !prev.some((existing) => existing.name === param.name))]);
      return added;
    },
    [setParameters, parameters, buildNamedParameter]
  );

  // Several stored parameters at once.
  const addParametersFromSuggestions = useCallback(
    (suggestions: ParameterSuggestion[]) => {
      setParameters((prev) => suggestions.reduce((list, suggestion) => addSuggestedParameter(list, suggestion), prev));
    },
    [setParameters]
  );


  // Calls pass values by position, so the order is part of the function.
  const moveParameter = useCallback(
    (index: number, direction: -1 | 1) => {
      setParameters((prev) => {
        const target = index + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },
    [setParameters]
  );

  // Returns whether it saved (the form had no errors).
  const handleSave = useCallback((): boolean => {
    const { errors: nextErrors, validParameters } = validateFunctionEditorForm({
      formData,
      parameters,
      formulaValidation,
      functions,
      functionId,
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const functionData = buildFunctionSaveData({ formData, validParameters });
    if (isNew) {
      addFunction(functionData);
    } else {
      updateFunction(functionId, functionData);
    }
    return true;
  }, [
    addFunction,
    formData,
    formulaValidation,
    functionId,
    functions,
    isNew,
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
    propertyHint,
    parameters,
    expandedParameters,
    parameterSuggestions,
    existingParameterNames,
    autocompleteCandidates: collectAutocompleteCandidates,
    candidatesForBase,
    handleSuggestionInserted,
    handleFormDataChange,
    handleVariableNameChange,
    addParameterFromSuggestion,
    addParameter,
    updateParameter,
    removeParameter,
    toggleParameterExpanded,
    moveParameter,
    addParameterNamed,
    addParametersNamed,
    addParametersFromSuggestions,
    handleSave,
    isValid,
  };
}

export type FunctionEditorState = ReturnType<typeof useFunctionEditorState>;
