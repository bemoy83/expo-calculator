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
import { CalculationModule, Field, ComputedOutput } from '@/lib/types';
import { 
  Plus, 
  Trash2, 
  Calculator
} from 'lucide-react';
import { EntityCard } from '@/components/shared/EntityCard';
import { FormulaBuilder } from '@/components/module-editor/FormulaBuilder';
import { ModulePreview } from '@/components/module-editor/ModulePreview';
import { ModuleDetailsCard } from '@/components/module-editor/ModuleDetailsCard';
import { FieldsManager } from '@/components/module-editor/FieldsManager';
import { ComputedOutputsManager } from '@/components/module-editor/ComputedOutputsManager';
import { ModuleEditorHeader } from '@/components/module-editor/ModuleEditorHeader';
import { ModuleEditorActions } from '@/components/module-editor/ModuleEditorActions';
import { useFormulaValidation } from '@/hooks/use-formula-validation';
import { usePreviewCost } from '@/hooks/use-preview-cost';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { useFieldManager } from '@/hooks/use-field-manager';
import { useFormulaVariables } from '@/hooks/use-formula-variables';
import { generateId } from '@/lib/utils';
import { validateComputedOutputVariableName, validateComputedOutputExpression } from '@/lib/utils/computed-outputs';
import { useFunctionsStore } from '@/lib/stores/functions-store';

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
  const [computedOutputs, setComputedOutputs] = useState<ComputedOutput[]>([]);
  const [computedOutputErrors, setComputedOutputErrors] = useState<Record<string, Record<string, string>>>({});
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
    computedOutputs,
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
    computedOutputs,
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
      setComputedOutputs(module.computedOutputs ? module.computedOutputs.map((o) => ({ ...o })) : []);
    } else {
      setEditingModuleId('new');
      setFormData({
        name: '',
        description: '',
        category: '',
        formula: '',
      });
      setFields([]);
      setComputedOutputs([]);
    }
    setErrors({});
    setFieldErrors({});
    setComputedOutputErrors({});
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
    setComputedOutputs([]);
    setErrors({});
    setFieldErrors({});
    setComputedOutputErrors({});
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
    computedOutputs,
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
      // Material fields don't need options - they pull from Materials Catalog
      if (Object.keys(fieldError).length > 0) {
        newFieldErrors[field.id] = fieldError;
      }
    });

    // Validate computed outputs
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
          computedOutputs, // Pass all outputs to check order
          functions,
          output.id // Pass current output ID to check if references are to previous outputs
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-24">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
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

            {/* COMPUTED OUTPUTS MANAGER */}
            <ComputedOutputsManager
              computedOutputs={computedOutputs}
              fields={fields}
              onUpdateOutput={(id, updates) => {
                setComputedOutputs((prev) =>
                  prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
                );
              }}
              onRemoveOutput={(id) => {
                setComputedOutputs((prev) => prev.filter((o) => o.id !== id));
                // Clear errors for removed output
                setComputedOutputErrors((prev) => {
                  const updated = { ...prev };
                  delete updated[id];
                  return updated;
                });
              }}
              onAddOutput={() => {
                const newOutput: ComputedOutput = {
                  id: generateId(),
                  label: '',
                  variableName: '',
                  expression: '',
                };
                setComputedOutputs((prev) => [...prev, newOutput]);
              }}
              errors={computedOutputErrors}
              onValidationError={(id, field, error) => {
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
              }}
            />
          </div>

          {/* RIGHT COLUMN - FORMULA BUILDER */}
          <div className="lg:col-span-2">
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
              computedOutputs={computedOutputs.map((o) => ({
                variableName: o.variableName,
                label: o.label,
                unitSymbol: o.unitSymbol,
              }))}
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
            <EntityCard
              key={module.id}
              title={module.name}
              description={module.description}
              category={module.category}
              onClick={() => startEditing(module)}
              actions={[
                {
                  icon: Trash2,
                  actionType: 'delete',
                  onAction: () => deleteModule(module.id),
                  ariaLabel: `Delete module: ${module.name}`,
                  confirmationMessage: `Are you sure you want to delete "${module.name}"?`,
                },
              ]}
              sections={[
                {
                  label: 'Fields',
                  content: (
                    <div className="flex flex-wrap gap-2">
                      {module.fields.map((field) => (
                        <Chip key={field.id} size="sm"
                          variant="primaryTonal">
                          {field.label}
                        </Chip>
                      ))}
                    </div>
                  ),
                  spacing: 'small',
                },
                ...(module.computedOutputs && module.computedOutputs.length > 0
                  ? [
                    {
                      label: 'Computed Outputs',
                      content: (
                        <div className="flex flex-wrap gap-2">
                          {module.computedOutputs.map((output) => (
                            <Chip key={output.id} size="sm" variant="outline">
                              {output.label}
                              {output.unitSymbol && (
                                <span className="ml-1 text-xs opacity-70">({output.unitSymbol})</span>
                              )}
                            </Chip>
                          ))}
                        </div>
                      ),
                      spacing: 'small' as const,
                    },
                  ]
                  : []),
                {
                  label: 'Formula',
                  content: (
                    <Textarea
                      autoGrow={true}
                      value={module.formula}
                      readOnly
                      className="text-xs text-md-primary font-mono"
                    />
                  ),
                  spacing: 'default',
                },
              ]}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
