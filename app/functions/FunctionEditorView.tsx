'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { FunctionDetailsCard } from '@/components/function-editor/FunctionDetailsCard';
import { FunctionFormulaCard } from '@/components/function-editor/FunctionFormulaCard';
import { FunctionTestPanel } from '@/components/function-editor/FunctionTestPanel';
import { ParametersManager } from '@/components/function-editor/ParametersManager';
import { useFunctionEditorState } from '@/components/function-editor/useFunctionEditorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditorPageHeader } from '@/components/shared/EditorPageHeader';
import { Card } from '@/components/ui/Card';
import { describeFunctionUsage, findFunctionUsage } from '@/lib/functions/function-usage';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
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
  const calculators = useCalculatorsStore((state) => state.calculators);
  const existingFunction = functionId === 'new' ? null : getFunction(functionId) ?? null;
  const isNew = functionId === 'new';
  const [confirmingRename, setConfirmingRename] = useState(false);

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

  // Who calls this function under its saved name. Renaming or deleting it breaks them.
  const usage = useMemo(
    () =>
      existingFunction
        ? findFunctionUsage(existingFunction.name, modules, functions, existingFunction.id, calculators)
        : { modules: [], functions: [], calculators: [] },
    [existingFunction, modules, functions, calculators]
  );
  const usedBy = describeFunctionUsage(usage);
  const newName = editor.formData.name.trim();
  const isRenamingUsedFunction = !!existingFunction && !!usedBy && newName !== existingFunction.name;

  const draft = useMemo(
    () => ({
      id: existingFunction?.id ?? 'new',
      name: newName,
      formula: editor.formData.formula,
      parameters: editor.parameters,
      returnUnitSymbol: existingFunction?.returnUnitSymbol,
    }),
    [existingFunction, newName, editor.formData.formula, editor.parameters]
  );

  const handleSubmit = () => {
    if (isRenamingUsedFunction) {
      setConfirmingRename(true);
      return;
    }
    editor.handleSave();
  };

  return (
    <Layout>
      <EditorPageHeader
        section="Functions"
        name={editor.formData.displayName}
        placeholderName={isNew ? 'New function' : 'Untitled function'}
        status={
          editor.formData.formula.trim()
            ? {
                valid: editor.formulaValidation.valid,
                validLabel: 'Formula valid',
                invalidLabel: 'Formula needs attention',
                detail: editor.formulaValidation.error,
              }
            : undefined
        }
        submitLabel={isNew ? 'Create function' : 'Save function'}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-5 items-start pb-10">
        <div className="min-w-0 space-y-6">
          <FunctionDetailsCard
            formData={editor.formData}
            errors={editor.errors}
            onFormDataChange={editor.handleFormDataChange}
            onVariableNameChange={editor.handleVariableNameChange}
            getAllCategories={getAllCategories}
            addCategory={addCategory}
            renameWarning={
              isRenamingUsedFunction
                ? `Called as ${existingFunction!.name}(…) by ${usedBy}. Those formulas won't find ${newName || 'the new name'} and will stop calculating until you update them.`
                : undefined
            }
          />

          {existingFunction && (
            <p className="-mt-3 text-xs text-ink-muted">
              {usedBy ? `Used by ${usedBy}.` : 'Not used yet.'}
            </p>
          )}

          <Card title="Add parameters from module fields" density="dense">
            {editor.availableModuleFieldNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {editor.availableModuleFieldNames.map((fieldName) => {
                  const isAdded = editor.existingParameterNames.has(fieldName.toLowerCase());
                  return (
                    <button
                      key={fieldName}
                      type="button"
                      onClick={() => editor.addParameterFromField(fieldName)}
                      disabled={isAdded}
                      aria-label={isAdded ? `${fieldName} is already a parameter` : `Add ${fieldName} as a parameter`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-numeric font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-action enabled:hover:opacity-80 disabled:cursor-default bg-action-bg text-action border-transparent disabled:border-action"
                    >
                      {isAdded ? (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      )}
                      {fieldName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
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
            formula={editor.formData.formula}
          />

          {editor.errors.parameters && <p className="text-sm text-danger">{editor.errors.parameters}</p>}
        </div>

        <div className="space-y-4 lg:sticky lg:top-sticky-offset lg:max-h-[calc(100vh-var(--app-header-h)-3rem)] lg:overflow-y-auto lg:pr-1">
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
          <FunctionTestPanel key={functionId} draft={draft} functions={functions} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmingRename}
        title="Rename a function that's in use?"
        message={`This function is called as ${existingFunction?.name ?? ''}(…) by ${usedBy}. After renaming it to ${newName}, those formulas stop calculating until you update them to the new name.`}
        confirmLabel="Rename anyway"
        destructive
        onConfirm={() => {
          setConfirmingRename(false);
          editor.handleSave();
        }}
        onCancel={() => setConfirmingRename(false)}
      />
    </Layout>
  );
}
