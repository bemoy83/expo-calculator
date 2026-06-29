'use client';

import { useRef, useState } from 'react';
import { useFieldManager } from '@/hooks/use-field-manager';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { useFormulaValidation } from '@/hooks/use-formula-validation';
import { useFormulaVariables } from '@/hooks/use-formula-variables';
import { usePreviewCost } from '@/hooks/use-preview-cost';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import type { CalculationModule, ComputedOutput, Labor, Material } from '@/lib/types';
import { generateId } from '@/lib/utils';
import {
  validateComputedOutputExpression,
  validateComputedOutputVariableName,
} from '@/lib/utils/computed-outputs';

type ModuleFormData = {
  name: string;
  description: string;
  category: string;
  formula: string;
};

type ModuleData = Omit<CalculationModule, 'id' | 'createdAt' | 'updatedAt'>;

interface UseModuleEditorStateOptions {
  addModule: (module: ModuleData) => void;
  updateModule: (id: string, module: Partial<CalculationModule>) => void;
  materials: Material[];
  labor: Labor[];
  getAllCategories: () => string[];
  addCategory: (category: string) => void;
}

const emptyFormData: ModuleFormData = {
  name: '',
  description: '',
  category: '',
  formula: '',
};

export function useModuleEditorState({
  addModule,
  updateModule,
  materials,
  labor,
  getAllCategories,
  addCategory,
}: UseModuleEditorStateOptions) {
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [expandedLabor, setExpandedLabor] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [fieldVariablesExpanded, setFieldVariablesExpanded] = useState(true);
  const [laborVariablesExpanded, setLaborVariablesExpanded] = useState(false);
  const [materialVariablesExpanded, setMaterialVariablesExpanded] = useState(false);
  const [formData, setFormData] = useState<ModuleFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});
  const [computedOutputs, setComputedOutputs] = useState<ComputedOutput[]>([]);
  const [computedOutputErrors, setComputedOutputErrors] = useState<Record<string, Record<string, string>>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewFieldValues, setPreviewFieldValues] = useState<Record<string, string | number | boolean>>({});
  const formulaTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    fields,
    expandedFields,
    addField,
    updateField,
    removeField,
    reorderFields,
    toggleFieldExpanded,
    setFieldRef,
    setFields,
  } = useFieldManager({
    onFieldChange: () => {
      if (formData.formula) {
        validateFormulaInput(formData.formula);
      }
    },
  });

  const { formulaValidation, validateFormula: validateFormulaInput } = useFormulaValidation({
    formula: formData.formula,
    fields,
    materials,
    labor,
    computedOutputs,
  });

  const { previewCalculatedCost, previewError } = usePreviewCost({
    showPreview,
    formula: formData.formula,
    fields,
    materials,
    labor,
    previewFieldValues,
    formulaValidationValid: formulaValidation.valid,
    computedOutputs,
  });

  const {
    isVariableInFormula,
    isPropertyReferenceInFormula,
    getMaterialFieldProperties,
    getLaborFieldProperties,
    availableFieldVariables,
    availableMaterialVariables,
    availableLaborVariables,
    collectAutocompleteCandidates,
    usedFields,
    allFields,
  } = useFormulaVariables({
    fields,
    materials,
    labor,
    formula: formData.formula,
    computedOutputs,
  });

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

  const startEditing = (module?: CalculationModule) => {
    if (module) {
      setEditingModuleId(module.id);
      setFormData({
        name: module.name,
        description: module.description || '',
        category: module.category || '',
        formula: module.formula,
      });
      setFields(module.fields.map((f) => ({ ...f })));
      setComputedOutputs(module.computedOutputs ? module.computedOutputs.map((o) => ({ ...o })) : []);
    } else {
      setEditingModuleId('new');
      setFormData(emptyFormData);
      setFields([]);
      setComputedOutputs([]);
    }
    setErrors({});
    setFieldErrors({});
    setComputedOutputErrors({});
  };

  const cancelEditing = () => {
    setEditingModuleId(null);
    setFormData(emptyFormData);
    setFields([]);
    setComputedOutputs([]);
    setErrors({});
    setFieldErrors({});
    setComputedOutputErrors({});
  };

  const handleReorderFields = (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    if (oldIndex < 0 || newIndex < 0) return;
    reorderFields(oldIndex, newIndex);
  };

  const initializePreview = () => {
    const defaults: Record<string, string | number | boolean> = {};
    fields.forEach((field) => {
      if (!field.variableName) return;

      if (field.defaultValue !== undefined) {
        defaults[field.variableName] = field.defaultValue;
        return;
      }

      switch (field.type) {
        case 'number':
        case 'dropdown':
        case 'text':
          defaults[field.variableName] = '';
          break;
        case 'boolean':
          defaults[field.variableName] = false;
          break;
        case 'material': {
          let candidateMaterials = materials;
          if (field.materialCategory && field.materialCategory.trim()) {
            candidateMaterials = materials.filter((m) => m.category === field.materialCategory);
          }
          defaults[field.variableName] = candidateMaterials.length > 0 ? candidateMaterials[0].variableName : '';
          break;
        }
      }
    });
    setPreviewFieldValues(defaults);
    setShowPreview(true);
  };

  const addComputedOutput = () => {
    const newOutput: ComputedOutput = {
      id: generateId(),
      label: '',
      variableName: '',
      expression: '',
    };
    setComputedOutputs((prev) => [...prev, newOutput]);
  };

  const updateComputedOutput = (id: string, updates: Partial<ComputedOutput>) => {
    setComputedOutputs((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const removeComputedOutput = (id: string) => {
    setComputedOutputs((prev) => prev.filter((o) => o.id !== id));
    setComputedOutputErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const setComputedOutputValidationError = (id: string, field: string, error?: string) => {
    setComputedOutputErrors((prev) => {
      const updated = { ...prev };
      if (!updated[id]) {
        updated[id] = {};
      }
      if (error) {
        updated[id][field] = error;
      } else {
        delete updated[id][field];
        if (Object.keys(updated[id]).length === 0) {
          delete updated[id];
        }
      }
      return updated;
    });
  };

  const insertVariableAtCursor = (variableName: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.formula;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore =
      start > 0 &&
      charBefore !== ' ' &&
      charBefore !== '\t' &&
      !/[+\-*/(]/.test(charBefore);
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter =
      end < currentValue.length &&
      charAfter !== ' ' &&
      charAfter !== '\t' &&
      !/[+\-*/)]/.test(charAfter);

    const insertedText = `${needsSpaceBefore ? ' ' : ''}${variableName}${needsSpaceAfter ? ' ' : ''}`;
    const newValue = before + insertedText + after;
    const newCursorPos = start + insertedText.length;

    setFormData({ ...formData, formula: newValue });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertOperatorAtCursor = (operator: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.formula;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore =
      start > 0 &&
      charBefore !== ' ' &&
      charBefore !== '(' &&
      charBefore !== '' &&
      !['+', '-', '*', '/', '(', '='].includes(charBefore);
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter =
      end < currentValue.length &&
      charAfter !== ' ' &&
      charAfter !== ')' &&
      charAfter !== '' &&
      !['+', '-', '*', '/', ')', '='].includes(charAfter) &&
      !operator.includes('(') &&
      !operator.includes(')');

    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    const newValue = before + spaceBefore + operator + spaceAfter + after;

    setFormData({ ...formData, formula: newValue });
    setTimeout(() => {
      const newPosition = start + spaceBefore.length + operator.length + spaceAfter.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newFieldErrors: Record<string, Record<string, string>> = {};
    const newComputedOutputErrors: Record<string, Record<string, string>> = {};
    const functions = useFunctionsStore.getState().functions;

    if (!formData.name.trim()) {
      newErrors.name = 'Module name is required';
    }

    if (!formData.formula.trim()) {
      newErrors.formula = 'Formula is required';
    } else if (!formulaValidation.valid) {
      newErrors.formula = formulaValidation.error || 'Invalid formula';
    }

    fields.forEach((field) => {
      const fieldError: Record<string, string> = {};
      if (!field.label.trim()) {
        fieldError.label = 'Label is required';
      }
      if (!field.variableName.trim()) {
        fieldError.variableName = 'Variable name is required';
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.variableName)) {
        fieldError.variableName = 'Invalid variable name format';
      } else {
        const duplicates = fields.filter((f) => f.variableName === field.variableName);
        if (duplicates.length > 1) {
          fieldError.variableName = 'Variable name must be unique';
        }
      }
      if (field.type === 'dropdown' && (!field.options || field.options.length === 0)) {
        fieldError.options = 'At least one option is required for dropdown';
      }
      if (Object.keys(fieldError).length > 0) {
        newFieldErrors[field.id] = fieldError;
      }
    });

    computedOutputs.forEach((output) => {
      const outputError: Record<string, string> = {};
      if (!output.label.trim()) {
        outputError.label = 'Label is required';
      }
      if (!output.variableName.trim()) {
        outputError.variableName = 'Variable name is required';
      } else {
        const varValidation = validateComputedOutputVariableName(
          output.variableName,
          computedOutputs.filter((o) => o.id !== output.id),
          fields
        );
        if (!varValidation.valid) {
          outputError.variableName = varValidation.error || 'Invalid variable name';
        }
      }
      if (!output.expression.trim()) {
        outputError.expression = 'Expression is required';
      } else {
        const exprValidation = validateComputedOutputExpression(
          output.expression,
          fields,
          computedOutputs,
          functions,
          materials,
          labor,
          output.id
        );
        if (!exprValidation.valid) {
          outputError.expression = exprValidation.error || 'Invalid expression';
        }
      }
      if (Object.keys(outputError).length > 0) {
        newComputedOutputErrors[output.id] = outputError;
      }
    });

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);
    setComputedOutputErrors(newComputedOutputErrors);
    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newFieldErrors).length === 0 &&
      Object.keys(newComputedOutputErrors).length === 0
    );
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const moduleData: ModuleData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || undefined,
      formula: formData.formula.trim(),
      fields: fields.map((f) => ({
        ...f,
        label: f.label.trim(),
        variableName: f.variableName.trim(),
      })),
      computedOutputs:
        computedOutputs.length > 0
          ? computedOutputs.map((o) => ({
              ...o,
              label: o.label.trim(),
              variableName: o.variableName.trim(),
              expression: o.expression.trim(),
              description: o.description?.trim() || undefined,
            }))
          : undefined,
    };

    if (editingModuleId === 'new') {
      addModule(moduleData);
    } else if (editingModuleId) {
      updateModule(editingModuleId, moduleData);
    }

    cancelEditing();
  };

  return {
    editingModuleId,
    formData,
    errors,
    fields,
    expandedFields,
    fieldErrors,
    computedOutputs,
    computedOutputErrors,
    formulaTextareaRef,
    formulaValidation,
    materials,
    labor,
    getAllCategories,
    addCategory,
    preview: {
      showPreview,
      previewFieldValues,
      previewCalculatedCost,
      previewError,
      closePreview: () => {
        setShowPreview(false);
        setPreviewFieldValues({});
      },
      setFieldValue: (fieldVariableName: string, value: string | number | boolean) => {
        setPreviewFieldValues((prev) => ({
          ...prev,
          [fieldVariableName]: value,
        }));
      },
    },
    fieldActions: {
      addField,
      updateField,
      removeField,
      handleReorderFields,
      toggleFieldExpanded,
      setFieldRef,
    },
    computedOutputActions: {
      addComputedOutput,
      updateComputedOutput,
      removeComputedOutput,
      setComputedOutputValidationError,
    },
    formulaBuilderProps: {
      formula: formData.formula,
      onFormulaChange: (formula: string) => setFormData({ ...formData, formula }),
      formulaTextareaRef,
      formulaValidation,
      formulaError: errors.formula,
      availableFieldVariables,
      availableMaterialVariables,
      availableLaborVariables,
      allFields,
      usedFields,
      fieldVariablesExpanded,
      materialVariablesExpanded,
      laborVariablesExpanded,
      expandedField,
      expandedMaterial,
      expandedLabor,
      onToggleFieldVariablesExpanded: () => setFieldVariablesExpanded(!fieldVariablesExpanded),
      onToggleMaterialVariablesExpanded: () => setMaterialVariablesExpanded(!materialVariablesExpanded),
      onToggleLaborVariablesExpanded: () => setLaborVariablesExpanded(!laborVariablesExpanded),
      onSetExpandedField: setExpandedField,
      onSetExpandedMaterial: setExpandedMaterial,
      onSetExpandedLabor: setExpandedLabor,
      isVariableInFormula,
      isPropertyReferenceInFormula,
      getMaterialFieldProperties,
      getLaborFieldProperties,
      insertVariableAtCursor,
      insertOperatorAtCursor,
      autocompleteSuggestions,
      selectedSuggestionIndex,
      isAutocompleteOpen,
      autocompletePosition,
      currentWord,
      recentlyUsedVariables,
      insertSuggestion,
      handleAutocompleteKeyDown,
      updateAutocompleteSuggestionsFinal,
      onSetSelectedSuggestionIndex: setSelectedSuggestionIndex,
      onSetIsAutocompleteOpen: setIsAutocompleteOpen,
      materials,
      fields,
      computedOutputs: computedOutputs.map((o) => ({
        variableName: o.variableName,
        label: o.label,
        unitSymbol: o.unitSymbol,
      })),
    },
    actions: {
      startEditing,
      cancelEditing,
      initializePreview,
      handleSubmit,
      setFormData,
    },
  };
}

export type ModuleEditorState = ReturnType<typeof useModuleEditorState>;
