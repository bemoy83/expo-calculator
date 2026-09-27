'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FunctionDetailsCard } from '@/components/function-editor/FunctionDetailsCard';
import { FunctionFormulaCard } from '@/components/function-editor/FunctionFormulaCard';
import { FunctionTestPanel } from '@/components/function-editor/FunctionTestPanel';
import { ParameterRail } from '@/components/function-editor/ParameterRail';
import { useFunctionEditorState } from '@/components/function-editor/useFunctionEditorState';
import { FormulaText } from '@/components/formula/FormulaText';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Breadcrumb, browseHref } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { copyOfFunction, describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '@/lib/functions/function-usage';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useCalculatorLibrary } from '@/hooks/use-calculators';
import { functionFormulaNames } from '@/lib/calculator/formula-tokens';

const listHref = (id?: string) => browseHref('/functions', { id });

// The function editor, one level below the functions list (mockup 2a): parameters and details in
// the rail, the formula and its palette in the middle, and a live test run with Save on the right.
// Save, Discard and the breadcrumb go back to the list with the function still selected.
export function FunctionEditorView({ functionId }: { functionId: string }) {
  const router = useRouter();
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
  const isNew = functionId === 'new';
  const [existingFunction] = useState(() => (isNew ? null : getFunction(functionId) ?? null));
  const [confirmingRename, setConfirmingRename] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(isNew);
  // A new function starts with one empty parameter, open to fill in.
  const [openIndex, setOpenIndex] = useState<number | null>(isNew ? 0 : null);
  const savedId = useRef<string | null>(null);

  const editor = useFunctionEditorState({
    functionId,
    existingFunction,
    functions,
    labor,
    calculators,
    addFunction: (func) => {
      const created = addFunction(func);
      savedId.current = created.id;
      return created;
    },
    updateFunction,
    // Called after a successful save.
    onClose: () => router.push(listHref(savedId.current ?? functionId)),
  });

  // Unsaved edits: the form differs from how it opened.
  const current = JSON.stringify({ formData: editor.formData, parameters: editor.parameters });
  const [opened] = useState(current);
  const dirty = current !== opened;

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
  // This function's own name, which isn't in the library until it's saved.
  const signatureNames = { ...formulaNames, functions: new Set([...formulaNames.functions, newName]) };
  const backHref = listHref(existingFunction?.id);

  const save = () => {
    if (isRenamingUsedFunction) {
      setConfirmingRename(true);
      return;
    }
    editor.handleSave();
  };

  const duplicate = () => {
    if (!existingFunction) return;
    const copy = addFunction(copyOfFunction(existingFunction, functions));
    router.push(`/functions/edit?id=${encodeURIComponent(copy.id)}`);
  };

  const formula = editor.formData.formula.trim();
  const category = editor.formData.category.trim();
  // The category it's filed under in the list (as saved), for the breadcrumb.
  const savedCategory = existingFunction?.category?.trim();

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      <PageHeader
        eyebrow={
          <Breadcrumb
            items={[
              { label: 'Catalog', href: '/materials' },
              { label: 'Functions', href: backHref },
              ...(savedCategory
                ? [{ label: savedCategory, href: browseHref('/functions', { category: savedCategory, id: existingFunction?.id }) }]
                : []),
            ]}
            meta={`Editing${dirty ? ' · Unsaved' : ''}`}
            onNavigate={(href, event) => {
              if (!dirty) return;
              event.preventDefault();
              setPendingLeave(href);
            }}
          />
        }
        editing
        title={
          <input
            value={editor.formData.displayName}
            onChange={(event) => editor.handleFormDataChange({ displayName: event.target.value })}
            placeholder="New function"
            aria-label="Function name"
            // A new function starts with its name, which also makes its call name.
            autoFocus={isNew}
            aria-invalid={editor.errors.displayName ? 'true' : undefined}
            size={Math.max(editor.formData.displayName.length, 14)}
            className="w-full min-w-0 bg-transparent placeholder:text-ink-faint focus:outline-none"
          />
        }
        status={
          formula
            ? editor.formulaValidation.valid
              ? { tone: 'ok', label: 'Formula works' }
              : { tone: 'error', label: 'Formula has an error' }
            : undefined
        }
        description={editor.errors.displayName && <span className="text-danger">{editor.errors.displayName}</span>}
        actions={
          existingFunction && (
            <Button
              variant="ghost"
              onClick={duplicate}
              disabled={dirty}
              title={dirty ? 'Save or discard your changes first' : undefined}
            >
              Duplicate
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:flex-1 lg:min-h-0">
        <div className="flex flex-col px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
          <ParameterRail
            parameters={editor.parameters}
            formula={editor.formData.formula}
            openIndex={openIndex}
            onToggle={(index) => setOpenIndex((open) => (open === index ? null : index))}
            onUpdate={editor.updateParameter}
            onRemove={(index) => {
              editor.removeParameter(index);
              setOpenIndex(null);
            }}
            onMove={(index, direction) => {
              editor.moveParameter(index, direction);
              setOpenIndex((open) => (open === index ? index + direction : open));
            }}
            onAdd={() => {
              editor.addParameter();
              setOpenIndex(editor.parameters.length);
            }}
            errors={editor.parameterErrors}
            suggestions={editor.parameterSuggestions}
            existingNames={editor.existingParameterNames}
            onReuse={editor.addParameterFromSuggestion}
          />
          {editor.errors.parameters && <p className="px-2.5 pt-2 text-xs text-danger">{editor.errors.parameters}</p>}

          <section aria-labelledby="function-details-heading" className="mt-[22px]">
            <div className="flex justify-between items-baseline px-2.5 pb-2">
              <Eyebrow as="h2" id="function-details-heading">
                Details
              </Eyebrow>
              <button
                type="button"
                onClick={() => setEditingDetails((editing) => !editing)}
                aria-expanded={editingDetails}
                className="font-numeric text-xs tracking-[.06em] text-ink hover:text-ink-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                {editingDetails ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingDetails ? (
              <div className="px-2.5">
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
              </div>
            ) : (
              <dl className="flex flex-col text-[13px]">
                <div className="flex justify-between gap-2 px-2.5 py-1.5">
                  <dt className="text-ink-muted">Call name</dt>
                  <dd className="font-numeric truncate">{newName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2 px-2.5 py-1.5">
                  <dt className="text-ink-muted">Category</dt>
                  <dd className="truncate">{category || '—'}</dd>
                </div>
                {editor.formData.description.trim() && (
                  <dd className="px-2.5 py-1.5 text-ink-muted leading-[1.4]">{editor.formData.description}</dd>
                )}
                {editor.errors.name && <dd className="px-2.5 py-1 text-xs text-danger">{editor.errors.name}</dd>}
              </dl>
            )}
          </section>
        </div>

        <div className="min-w-0 flex flex-col px-4 sm:px-7 py-5 lg:overflow-y-auto">
          <div className="flex flex-wrap items-baseline gap-x-2.5 font-numeric text-[13px]">
            <span className="font-ui text-xs text-ink-muted">Call as</span>
            <span className="break-all">
              <FormulaText expression={formatFunctionSignature(draft)} names={signatureNames} />
              {existingFunction?.returnUnitSymbol && <span className="text-ink-faint"> → {existingFunction.returnUnitSymbol}</span>}
            </span>
          </div>
          <div className="mt-3.5">
            <FunctionFormulaCard
              formula={editor.formData.formula}
              formulaNames={formulaNames}
              onFormulaChange={(next) => editor.handleFormDataChange({ formula: next })}
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
          {existingFunction && (
            <div className="mt-auto pt-6">
              <Button variant="danger" size="sm" className="-ml-3" onClick={() => setConfirmingDelete(true)}>
                Delete function
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
          <FunctionTestPanel draft={draft} functions={functions} />

          <section aria-labelledby="function-used-by" className="mt-[18px]">
            <Eyebrow as="h2" id="function-used-by" className="mb-1.5">
              Used by
            </Eyebrow>
            {usage.calculators.length + usage.functions.length === 0 ? (
              <p className="text-[13px] text-ink-muted">{isNew ? 'Not saved yet.' : 'Not used yet.'}</p>
            ) : (
              <ul className="text-sm">
                {usage.calculators.map((calculator) => (
                  <li key={calculator.id} className="flex justify-between gap-3 py-[7px] border-b border-border">
                    <span className="truncate">{calculator.name}</span>
                    <span className="font-numeric text-xs text-ink-faint">calculator</span>
                  </li>
                ))}
                {usage.functions.map((func) => (
                  <li key={func.id} className="flex justify-between gap-3 py-[7px] border-b border-border">
                    <span className="truncate">{func.name}</span>
                    <span className="font-numeric text-xs text-ink-faint">function</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-auto pt-5 flex flex-col gap-1.5">
            {(dirty || isNew) && (
              <Button variant="ghost" onClick={() => router.push(backHref)} className="self-center">
                {isNew ? 'Cancel' : 'Discard changes'}
              </Button>
            )}
            <Button variant="primary" block onClick={save} className="h-[42px] text-sm">
              {isNew ? 'Create function' : 'Save function'}
            </Button>
          </div>
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
          router.push('/functions');
        }}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        isOpen={pendingLeave !== null}
        title="Discard your changes?"
        message="Your changes to this function aren't saved. Leaving now throws them away."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          const href = pendingLeave;
          setPendingLeave(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingLeave(null)}
      />
    </div>
  );
}
