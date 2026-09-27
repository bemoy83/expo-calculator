'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { FunctionDetailsCard } from '@/components/function-editor/FunctionDetailsCard';
import { FunctionFormulaCard } from '@/components/function-editor/FunctionFormulaCard';
import { FunctionTestPanel } from '@/components/function-editor/FunctionTestPanel';
import { ParametersManager } from '@/components/function-editor/ParametersManager';
import { useFunctionEditorState } from '@/components/function-editor/useFunctionEditorState';
import { FormulaText } from '@/components/formula/FormulaText';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '@/lib/functions/function-usage';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useCalculatorLibrary } from '@/hooks/use-calculators';
import { functionFormulaNames } from '@/lib/calculator/formula-tokens';
import type { SharedFunction } from '@/lib/types';

export interface FunctionEditorViewProps {
  /** A saved function's id, or 'new' */
  functionId: string;
  /** After a save: the saved function's id (a new one's too) */
  onSaved: (id: string) => void;
  /** Throw the edits away (a new function: stop creating it) */
  onDiscard: () => void;
  onDeleted: () => void;
  onDuplicated: (id: string) => void;
  /** Whether there are edits that aren't saved, so the page can ask before switching away */
  onDirtyChange: (dirty: boolean) => void;
}

/** "stendere" → "stendere_2", or the next number not taken. */
function freeCallName(name: string, functions: SharedFunction[]): string {
  const base = name.replace(/_\d+$/, '');
  const taken = new Set(functions.map((func) => func.name));
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

// The functions page's editor (mockup 3d): the function in the centre, and a live pane with a
// test run, what uses it, and Save. Rendered as two grid cells of the page's pane grid.
export function FunctionEditorView({
  functionId,
  onSaved,
  onDiscard,
  onDeleted,
  onDuplicated,
  onDirtyChange,
}: FunctionEditorViewProps) {
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const updateFunction = useFunctionsStore((state) => state.updateFunction);
  const deleteFunction = useFunctionsStore((state) => state.deleteFunction);
  const getFunction = useFunctionsStore((state) => state.getFunction);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);
  const labor = useLaborStore((state) => state.labor);
  const calculators = useCalculatorsStore((state) => state.calculators);
  const library = useCalculatorLibrary();
  const existingFunction = functionId === 'new' ? null : getFunction(functionId) ?? null;
  const isNew = functionId === 'new';
  const [confirmingRename, setConfirmingRename] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const editor = useFunctionEditorState({
    functionId,
    existingFunction,
    functions,
    labor,
    calculators,
    addFunction: (func) => {
      const created = addFunction(func);
      setSavedId(created.id);
      return created;
    },
    updateFunction,
    // Called after a successful save.
    onClose: () => setSavedId((id) => id ?? functionId),
  });

  useEffect(() => {
    if (savedId) onSaved(savedId);
  }, [savedId, onSaved]);

  // Unsaved edits: the form differs from how it opened.
  const current = JSON.stringify({ formData: editor.formData, parameters: editor.parameters });
  const [opened] = useState(current);
  const dirty = current !== opened;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Who calls this function under its saved name. Renaming or deleting it breaks them.
  const usage = useMemo(
    () =>
      existingFunction
        ? findFunctionUsage(existingFunction.name, functions, existingFunction.id, calculators)
        : { functions: [], calculators: [] },
    [existingFunction, functions, calculators]
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
  const formulaNames = functionFormulaNames({ parameters: editor.parameters }, library);

  const handleSubmit = () => {
    if (isRenamingUsedFunction) {
      setConfirmingRename(true);
      return;
    }
    editor.handleSave();
  };

  const handleDuplicate = () => {
    if (!existingFunction) return;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = existingFunction;
    const copy = addFunction({
      ...rest,
      displayName: `${existingFunction.displayName || existingFunction.name} copy`,
      name: freeCallName(existingFunction.name, functions),
    });
    onDuplicated(copy.id);
  };

  const title = editor.formData.displayName;

  return (
    <>
      <div className="min-w-0 flex flex-col gap-5 px-4 sm:px-8 py-6 lg:overflow-y-auto">
        <div>
          <div className="flex items-center gap-3">
            <input
              value={title}
              onChange={(event) => editor.handleFormDataChange({ displayName: event.target.value })}
              placeholder={isNew ? 'New function' : 'Untitled function'}
              aria-label="Function name"
              aria-invalid={editor.errors.displayName ? 'true' : undefined}
              className="flex-1 min-w-0 pb-1.5 bg-transparent border-b border-border-strong text-[22px] font-bold tracking-[-.02em] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
            />
            {existingFunction && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleDuplicate}>
                  Duplicate
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
          {editor.errors.displayName && <p className="mt-1.5 text-xs text-danger">{editor.errors.displayName}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-muted">Call as</span>
          <div className="font-numeric text-base break-all">
            <FormulaText expression={formatFunctionSignature(draft)} names={formulaNames} />
            {existingFunction?.returnUnitSymbol && (
              <span className="text-ink-faint"> → {existingFunction.returnUnitSymbol}</span>
            )}
          </div>
        </div>

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

        <div className="space-y-3">
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
          {editor.parameterSuggestions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-ink-muted">
                Reuse a parameter from your other functions and calculator inputs, with its label, unit and kind:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {editor.parameterSuggestions.map((suggestion) => {
                  const isAdded = editor.existingParameterNames.has(suggestion.name.toLowerCase());
                  const detail =
                    suggestion.kind && suggestion.kind !== 'number'
                      ? suggestion.kind === 'boolean'
                        ? 'yes/no'
                        : suggestion.kind
                      : suggestion.unitSymbol;
                  const description = `${suggestion.name}${detail ? ` (${detail})` : ''}`;
                  return (
                    <button
                      key={`${suggestion.name}|${suggestion.kind ?? ''}|${suggestion.unitSymbol ?? ''}`}
                      type="button"
                      onClick={() => editor.addParameterFromSuggestion(suggestion)}
                      disabled={isAdded}
                      title={suggestion.label}
                      aria-label={isAdded ? `${description} is already a parameter` : `Add ${description} as a parameter`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-numeric font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-action enabled:hover:opacity-80 disabled:cursor-default bg-sunken text-token-input border-transparent disabled:border-token-input"
                    >
                      {isAdded ? (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      )}
                      {suggestion.name}
                      {detail && <span className="font-normal opacity-70">{detail}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <FunctionFormulaCard
          formula={editor.formData.formula}
          formulaNames={formulaNames}
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

      <div className="flex flex-col gap-4 px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
        <FunctionTestPanel key={functionId} draft={draft} functions={functions} />

        <div className="my-1 border-t border-dashed border-border-strong" />

        <section aria-labelledby="function-used-by" className="flex flex-col gap-2.5">
          <Eyebrow as="h2" id="function-used-by">
            Used by
          </Eyebrow>
          {usage.calculators.length + usage.functions.length === 0 ? (
            <p className="text-[13px] text-ink-muted">{isNew ? 'Not saved yet.' : 'Not used yet.'}</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm">
              {usage.calculators.map((calculator) => (
                <li key={calculator.id} className="flex justify-between gap-3">
                  <span className="font-semibold truncate">{calculator.name}</span>
                  <span className="font-numeric text-xs text-ink-faint">calculator</span>
                </li>
              ))}
              {usage.functions.map((func) => (
                <li key={func.id} className="flex justify-between gap-3">
                  <span className="font-semibold truncate">{func.name}</span>
                  <span className="font-numeric text-xs text-ink-faint">function</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-auto pt-2 flex flex-col gap-2">
          {(dirty || isNew) && (
            <Button variant="ghost" size="sm" onClick={onDiscard} className="self-center">
              {isNew ? 'Cancel' : 'Discard changes'}
            </Button>
          )}
          <Button variant="primary" block onClick={handleSubmit} className="text-sm">
            {isNew ? 'Create function' : 'Save function'}
          </Button>
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

      <ConfirmDialog
        isOpen={confirmingDelete}
        title={`Delete "${existingFunction?.displayName || existingFunction?.name || ''}"?`}
        message={
          usedBy
            ? `It's used by ${usedBy}. Deleting it will stop those formulas from calculating.`
            : 'It isn’t used by any calculator or function.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          if (existingFunction) deleteFunction(existingFunction.id);
          onDeleted();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
