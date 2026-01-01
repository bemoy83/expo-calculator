'use client';

import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Textarea } from '@/components/ui/Textarea';

import { useCategoriesStore } from '@/lib/stores/categories-store';
import { CalculationModule, Field } from '@/lib/types';
import { 
  Plus, 
  Trash2, 
  Calculator
} from 'lucide-react';
import { FormulaBuilder } from '@/components/module-editor/FormulaBuilder';
import { ModulePreview } from '@/components/module-editor/ModulePreview';
import { ModuleDetailsCard } from '@/components/module-editor/ModuleDetailsCard';
import { FieldsManager } from '@/components/module-editor/FieldsManager';
import { ModuleEditorHeader } from '@/components/module-editor/ModuleEditorHeader';
import { ModuleEditorActions } from '@/components/module-editor/ModuleEditorActions';
import { useFormulaValidation } from '@/hooks/use-formula-validation';
import { usePreviewCost } from '@/hooks/use-preview-cost';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { useFieldManager } from '@/hooks/use-field-manager';
import { useFormulaVariables } from '@/hooks/use-formula-variables';

export default function ModulesPage() {
  const modules = useModulesStore((state) => state.modules);
  const addModule = useModulesStore((state) => state.addModule);
  const updateModule = useModulesStore((state) => state.updateModule);
  const deleteModule = useModulesStore((state) => state.deleteModule);
  const materials = useMaterialsStore((state) => state.materials);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [fieldVariablesExpanded, setFieldVariablesExpanded] = useState(true);
  const [materialVariablesExpanded, setMaterialVariablesExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    formula: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});
  const formulaTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Field management hook
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
      // Re-validate formula when fields change
      if (formData.formula) {
        validateFormulaInput(formData.formula);
      }
    },
  });
  
  // Formula validation hook
  const { formulaValidation, validateFormula: validateFormulaInput } = useFormulaValidation({
    formula: formData.formula,
    fields,
    materials,
  });
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewFieldValues, setPreviewFieldValues] = useState<Record<string, string | number | boolean>>({});
  
  // Preview cost calculation hook
  const { previewCalculatedCost, previewError } = usePreviewCost({
    showPreview,
    formula: formData.formula,
    fields,
    materials,
    previewFieldValues,
    formulaValidationValid: formulaValidation.valid,
  });

  // Initialize editing state
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
    } else {
      setEditingModuleId('new');
      setFormData({
        name: '',
        description: '',
        category: '',
        formula: '',
      });
      setFields([]);
    }
    setErrors({});
    setFieldErrors({});
  };

  const cancelEditing = () => {
    setEditingModuleId(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      formula: '',
    });
    setFields([]);
    setErrors({});
    setFieldErrors({});
  };

  // Handle reorder event - reorder fields array
  const handleReorderFields = (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    if (oldIndex < 0 || newIndex < 0) return;
    reorderFields(oldIndex, newIndex);
  };

  // Formula variables hook
  const {
    isVariableInFormula,
    isPropertyReferenceInFormula,
    getMaterialFieldProperties,
    availableFieldVariables,
    availableMaterialVariables,
    collectAutocompleteCandidates,
    usedFields,
    allFields,
  } = useFormulaVariables({
    fields,
    materials,
    formula: formData.formula,
  });

  // Helper function to initialize preview with default values
  const initializePreview = () => {
    const defaults: Record<string, string | number | boolean> = {};
    fields.forEach((field) => {
      if (field.variableName) {
        if (field.defaultValue !== undefined) {
          defaults[field.variableName] = field.defaultValue;
        } else {
          switch (field.type) {
            case 'number':
              defaults[field.variableName] = ''; // Empty, not 0
              break;
            case 'boolean':
              defaults[field.variableName] = false;
              break;
            case 'dropdown':
              defaults[field.variableName] = ''; // Empty - require selection
              break;
            case 'material':
              // If category exists, preselect first matching material
              const materials = useMaterialsStore.getState().materials;
              let candidateMaterials = materials;
              if (field.materialCategory && field.materialCategory.trim()) {
                candidateMaterials = materials.filter(m => m.category === field.materialCategory);
              }
              if (candidateMaterials.length > 0) {
                defaults[field.variableName] = candidateMaterials[0].variableName;
              } else {
                defaults[field.variableName] = '';
              }
              break;
            case 'text':
              defaults[field.variableName] = '';
              break;
          }
        }
      }
    });
    setPreviewFieldValues(defaults);
    setShowPreview(true);
  };

  const insertVariableAtCursor = (variableName: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.formula;
    
    // Insert variable at cursor position
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    
    // Determine if we need spaces around the variable
    // Add space before if there's content before and it's not whitespace/operator
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore = start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '\t' && 
      !/[+\-*/(]/.test(charBefore);
    
    // Add space after if there's content after and it's not whitespace/operator
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter = end < currentValue.length && 
      charAfter !== ' ' && 
      charAfter !== '\t' && 
      !/[+\-*/)]/.test(charAfter);
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    const insertedText = `${spaceBefore}${variableName}${spaceAfter}`;
    
    const newValue = before + insertedText + after;
    const newCursorPos = start + insertedText.length;
    
    // Update state
    setFormData({ ...formData, formula: newValue });
    
    // Note: Recently used variables are tracked by the autocomplete hook
    // Manual insertions don't need to update the recent list
    
    // Set cursor position after React updates
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
    
    // Insert operator at cursor position
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    
    // Add space before operator if needed
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore = start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '(' &&
      charBefore !== '' &&
      !['+', '-', '*', '/', '(', '='].includes(charBefore);
    
    // Add space after operator if needed (except for parentheses and functions)
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter = end < currentValue.length && 
      charAfter !== ' ' && 
      charAfter !== ')' &&
      charAfter !== '' &&
      !['+', '-', '*', '/', ')', '='].includes(charAfter) &&
      !operator.includes('(') && !operator.includes(')');
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    
    const newValue = before + spaceBefore + operator + spaceAfter + after;
    
    setFormData({ ...formData, formula: newValue });
    
    // Set cursor position after inserted operator
    setTimeout(() => {
      const newPosition = start + spaceBefore.length + operator.length + spaceAfter.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };




  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newFieldErrors: Record<string, Record<string, string>> = {};

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
      // Material fields don't need options - they pull from Materials Catalog
      if (Object.keys(fieldError).length > 0) {
        newFieldErrors[field.id] = fieldError;
      }
    });

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const moduleData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || undefined,
      formula: formData.formula.trim(),
      fields: fields.map((f) => ({
        ...f,
        label: f.label.trim(),
        variableName: f.variableName.trim(),
      })),
    };

    if (editingModuleId === 'new') {
      addModule(moduleData);
    } else if (editingModuleId) {
      updateModule(editingModuleId, moduleData);
    }

    cancelEditing();
  };


  // Formula autocomplete hook (must be after collectAutocompleteCandidates is defined)
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

  // Show workspace if editing
  if (editingModuleId) {
    return (
      <Layout>
        <ModuleEditorHeader editingModuleId={editingModuleId} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* MODULE DETAILS PANEL */}
            <ModuleDetailsCard
              formData={formData}
              errors={errors}
              onFormDataChange={(updates) => setFormData({ ...formData, ...updates })}
              getAllCategories={getAllCategories}
              addCategory={addCategory}
            />

            {/* INPUT FIELDS MANAGER */}
            <FieldsManager
              fields={fields}
              expandedFields={expandedFields}
              fieldErrors={fieldErrors}
              onToggleExpanded={toggleFieldExpanded}
              onUpdateField={updateField}
              onRemoveField={removeField}
              onReorder={handleReorderFields}
              onAddField={addField}
              setFieldRef={setFieldRef}
            />
          </div>

          {/* RIGHT COLUMN - FORMULA BUILDER */}
          <div className="lg:col-span-1">
            <FormulaBuilder
              formula={formData.formula}
              onFormulaChange={(formula) => setFormData({ ...formData, formula })}
              formulaTextareaRef={formulaTextareaRef}
              formulaValidation={formulaValidation}
              formulaError={errors.formula}
              availableFieldVariables={availableFieldVariables}
              availableMaterialVariables={availableMaterialVariables}
              allFields={allFields}
              usedFields={usedFields}
              fieldVariablesExpanded={fieldVariablesExpanded}
              materialVariablesExpanded={materialVariablesExpanded}
              expandedField={expandedField}
              expandedMaterial={expandedMaterial}
              onToggleFieldVariablesExpanded={() => setFieldVariablesExpanded(!fieldVariablesExpanded)}
              onToggleMaterialVariablesExpanded={() => setMaterialVariablesExpanded(!materialVariablesExpanded)}
              onSetExpandedField={setExpandedField}
              onSetExpandedMaterial={setExpandedMaterial}
              isVariableInFormula={isVariableInFormula}
              isPropertyReferenceInFormula={isPropertyReferenceInFormula}
              getMaterialFieldProperties={getMaterialFieldProperties}
              insertVariableAtCursor={insertVariableAtCursor}
              insertOperatorAtCursor={insertOperatorAtCursor}
              autocompleteSuggestions={autocompleteSuggestions}
              selectedSuggestionIndex={selectedSuggestionIndex}
              isAutocompleteOpen={isAutocompleteOpen}
              autocompletePosition={autocompletePosition}
              currentWord={currentWord}
              recentlyUsedVariables={recentlyUsedVariables}
              insertSuggestion={insertSuggestion}
              handleAutocompleteKeyDown={handleAutocompleteKeyDown}
              updateAutocompleteSuggestionsFinal={updateAutocompleteSuggestionsFinal}
              onSetSelectedSuggestionIndex={setSelectedSuggestionIndex}
              onSetIsAutocompleteOpen={setIsAutocompleteOpen}
              materials={materials}
              fields={fields}
            />
          </div>
        </div>

        {/* PREVIEW OVERLAY */}
        {showPreview && (
          <ModulePreview
            formData={formData}
            fields={fields}
            previewFieldValues={previewFieldValues}
            previewCalculatedCost={previewCalculatedCost}
            previewError={previewError}
            materials={materials}
            onClose={() => {
              setShowPreview(false);
              setPreviewFieldValues({});
            }}
            onFieldValueChange={(fieldVariableName, value) => {
              setPreviewFieldValues(prev => ({
                ...prev,
                [fieldVariableName]: value
              }));
            }}
          />
        )}

        {/* BOTTOM ACTION BAR */}
        <ModuleEditorActions
          editingModuleId={editingModuleId}
          fields={fields}
          formulaValidationValid={formulaValidation.valid}
          onAddField={addField}
          onPreview={initializePreview}
          onCancel={cancelEditing}
          onSubmit={handleSubmit}
        />
      </Layout>
    );
  }

  // Default list view
  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Calculation Modules</h1>
          <p className="text-lg text-md-on-surface-variant">Create reusable calculation modules with custom fields and formulas</p>
        </div>
        <Button onClick={() => startEditing()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-md-surface-variant elevation-4 mb-6" aria-hidden="true">
              <Calculator className="h-12 w-12 text-md-on-surface-variant" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">No Modules Yet</h3>
            <p className="text-base text-md-on-surface-variant mb-8 max-w-md mx-auto leading-relaxed">Create your first calculation module to get started building professional estimates.</p>
            <Button onClick={() => startEditing()} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className="hover:border-accent/30 transition-smooth cursor-pointer group relative"
              onClick={() => startEditing(module)}
            >
              <Card className="h-full hover:border-accent/30">
                {/* Delete button - top right corner */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this module?')) {
                      deleteModule(module.id);
                    }
                  }}
                  className="absolute top-0 right-0 p-2 text-md-on-surface-variant hover:text-destructive hover:bg-md-surface-variant rounded-full transition-smooth active:scale-95 z-10"
                  aria-label="Delete module"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <h3 className="text-lg font-bold text-md-primary mb-3 transition-smooth tracking-tight pr-10">
                  {module.name}
                </h3>
              {module.category && (
                <div className="mb-3">
                    <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-2">
                      Categories
                    </p>
                  <Chip size="sm">{module.category}</Chip>
                </div>
              )}
                <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-2">
                  Description
                </p>
              <p className="text-sm text-md-on-surface-variant mb-4 line-clamp-2">
                {module.description || 'No description'}
              </p>
              <div className="mb-5">
                <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-2">Fields</p>
                <div className="flex flex-wrap gap-2">
                  {module.fields.map((field) => (
                    <Chip key={field.id} size="sm">
                      {field.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-md-on-surface-variant mb-1">Formula:</p>
                <Textarea
                autoGrow={true}
                value={module.formula}
                readOnly
                className="text-xs text-md-primary font-mono cursor-default"
              />
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
