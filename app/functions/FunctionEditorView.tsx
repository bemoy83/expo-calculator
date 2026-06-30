'use client';

import { CheckCircle2, Plus } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { FunctionDetailsCard } from '@/components/function-editor/FunctionDetailsCard';
import { FunctionEditorActions } from '@/components/function-editor/FunctionEditorActions';
import { FunctionEditorHeader } from '@/components/function-editor/FunctionEditorHeader';
import { FunctionFormulaCard } from '@/components/function-editor/FunctionFormulaCard';
import { ParametersManager } from '@/components/function-editor/ParametersManager';
import { useFunctionEditorState } from '@/components/function-editor/useFunctionEditorState';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useModulesStore } from '@/lib/stores/modules-store';

export interface FunctionEditorViewProps {
  functionId: string;
  onClose: () => void;
}

export function FunctionEditorView({ functionId, onClose }: FunctionEditorViewProps) {
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const updateFunction = useFunctionsStore((state) => state.updateFunction);
  const getFunction = useFunctionsStore((state) => state.getFunction);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);
  const labor = useLaborStore((state) => state.labor);
  const modules = useModulesStore((state) => state.modules);
  const existingFunction = functionId === 'new' ? null : getFunction(functionId) ?? null;

  const editor = useFunctionEditorState({
    functionId,
    existingFunction,
    functions,
    labor,
    modules,
    addFunction,
    updateFunction,
    onClose,
  });

  return (
    <Layout>
      <FunctionEditorHeader functionId={functionId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          <FunctionDetailsCard
            formData={editor.formData}
            errors={editor.errors}
            onFormDataChange={editor.handleFormDataChange}
            onVariableNameChange={editor.handleVariableNameChange}
            getAllCategories={getAllCategories}
            addCategory={addCategory}
          />

          <Card title="Add parameters from module fields">
            {editor.availableModuleFieldNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {editor.availableModuleFieldNames.map((fieldName) => {
                  const isAdded = editor.existingParameterNames.has(fieldName.toLowerCase());
                  return (
                    <Chip
                      key={fieldName}
                      size="sm"
                      variant={isAdded ? 'success' : 'primary'}
                      onClick={() => editor.addParameterFromField(fieldName)}
                      disabled={isAdded}
                      leadingIcon={
                        isAdded ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )
                      }
                    >
                      {fieldName}
                    </Chip>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-md-on-surface-variant">
                No module fields available yet. Create a module with fields to reuse them here.
              </p>
            )}
          </Card>

          <ParametersManager
            parameters={editor.parameters}
            expandedParameters={editor.expandedParameters}
            parameterErrors={editor.parameterErrors}
            onToggleExpanded={editor.toggleParameterExpanded}
            onUpdateParameter={editor.updateParameter}
            onRemoveParameter={editor.removeParameter}
            onAddParameter={editor.addParameter}
          />

          {editor.errors.parameters && (
            <p className="text-sm text-destructive">{editor.errors.parameters}</p>
          )}
        </div>

        <div className="lg:col-span-1">
          <FunctionFormulaCard
            formula={editor.formData.formula}
            onFormulaChange={(formula) => editor.handleFormDataChange({ formula })}
            formulaTextareaRef={editor.formulaTextareaRef}
            formulaValidation={editor.formulaValidation}
            formulaError={editor.errors.formula}
            parameters={editor.parameters}
            onInsertParameter={editor.insertParameterAtCursor}
            onInsertOperator={editor.insertOperatorAtCursor}
            autocompleteSuggestions={editor.autocomplete.autocompleteSuggestions}
            selectedSuggestionIndex={editor.autocomplete.selectedSuggestionIndex}
            isAutocompleteOpen={editor.autocomplete.isAutocompleteOpen}
            autocompletePosition={editor.autocomplete.autocompletePosition}
            currentWord={editor.autocomplete.currentWord}
            recentlyUsedVariables={editor.autocomplete.recentlyUsedVariables}
            insertSuggestion={editor.autocomplete.insertSuggestion}
            handleAutocompleteKeyDown={editor.autocomplete.handleAutocompleteKeyDown}
            updateAutocompleteSuggestionsFinal={editor.autocomplete.updateAutocompleteSuggestionsFinal}
            setSelectedSuggestionIndex={editor.autocomplete.setSelectedSuggestionIndex}
            setIsAutocompleteOpen={editor.autocomplete.setIsAutocompleteOpen}
          />
        </div>
      </div>

      <FunctionEditorActions
        functionId={functionId}
        isValid={editor.isValid}
        onCancel={onClose}
        onSubmit={editor.handleSave}
        onAddParameter={editor.addParameter}
      />
    </Layout>
  );
}
