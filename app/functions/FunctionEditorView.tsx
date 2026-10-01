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
import { Breadcrumb, browseHref, withSelected } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLeaveEditor } from '@/components/shared/NavigationGuard';
import { HeaderDivider } from '@/components/shared/OverflowMenu';
import { SaveButton } from '@/components/shared/SaveButton';
import { IconButton } from '@/components/ui/IconButton';
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import { SaveChangesDialog } from '@/components/shared/SaveChangesDialog';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import { notify } from '@/lib/stores/notifications-store';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { copyOfFunction, describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '@/lib/functions/function-usage';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { getMaterialCategories } from '@/lib/utils/material-category';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useCalculatorLibrary } from '@/hooks/use-calculators';
import { functionFormulaNames, unknownValueNames } from '@/lib/calculator/formula-tokens';

const listHref = (id?: string) => browseHref('/functions', { id });

// The function editor, one level below the functions list (mockup 2a): parameters and details in
// the rail, the formula and its palette in the middle, and a live test run on the right. The
// header has ⋯ (Duplicate, Delete) · Close · Save; Save stays here, and Close and the breadcrumb
// go back to the list with the function still selected, asking first about unsaved edits.
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
  const materials = useMaterialsStore((state) => state.materials);
  const materialCategories = useMemo(() => getMaterialCategories(materials), [materials]);
  const calculators = useCalculatorsStore((state) => state.calculators);
  const library = useCalculatorLibrary();
  const isNew = functionId === 'new';
  // As last saved; a save refreshes it, so renaming again compares with the new name.
  const [existingFunction, setExistingFunction] = useState(() => (isNew ? null : getFunction(functionId) ?? null));
  // A save waiting on "Rename anyway", and where to go after it (when leaving).
  const [confirmingRename, setConfirmingRename] = useState<{ then?: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingDetails, setEditingDetails] = useState(isNew);
  // A new function starts with one empty parameter, open to fill in.
  const [openIndex, setOpenIndex] = useState<number | null>(isNew ? 0 : null);
  // A parameter just added opens with its Label focused.
  const [focusLabelOf, setFocusLabelOf] = useState<number | null>(null);
  const openNewParameter = (index: number) => {
    setOpenIndex(index);
    setFocusLabelOf(index);
  };
  const savedId = useRef<string | null>(null);

  const editor = useFunctionEditorState({
    functionId,
    existingFunction,
    functions,
    labor,
    materials,
    calculators,
    addFunction: (func) => {
      const created = addFunction(func);
      savedId.current = created.id;
      return created;
    },
    updateFunction,
  });

  // Unsaved edits: the form differs from how it opened or was last saved.
  const current = JSON.stringify({ formData: editor.formData, parameters: editor.parameters });
  const [opened, setOpened] = useState(current);
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
  const { leavingTo, setLeavingTo, leave } = useLeaveEditor(dirty);

  // Saves and stays, or goes to `then` (leaving with Save). A new function's first save opens
  // it at its own address (the page is keyed by id, so the editor starts again from the saved one).
  const commitSave = (then?: string) => {
    if (!editor.handleSave()) return;
    const id = savedId.current ?? functionId;
    notify({ variant: 'success', message: `Saved “${editor.formData.displayName.trim() || newName}”.` });
    // Back in the list, a function saved for the first time is the one selected.
    if (then) router.push(isNew ? withSelected(then, '/functions', id) : then);
    else if (isNew) router.replace(`/functions/edit?id=${encodeURIComponent(id)}`);
    else {
      setExistingFunction(getFunction(id) ?? null);
      setOpened(current);
    }
  };
  const save = (then?: string) => {
    if (isRenamingUsedFunction) {
      setConfirmingRename({ then });
      return;
    }
    commitSave(then);
  };
  useSaveShortcut(save);

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
              { label: 'Functions', href: backHref },
              ...(savedCategory
                ? [{ label: savedCategory, href: browseHref('/functions', { category: savedCategory, id: existingFunction?.id }) }]
                : []),
            ]}
            meta={`Editing${dirty ? ' · Unsaved' : ''}`}
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
            ? // While an error is still settling, the header keeps saying what it said before.
              (editor.formulaValidation.pending ? editor.formulaValidation.wasValid : editor.formulaValidation.valid)
              ? { tone: 'ok', label: 'Formula works' }
              : { tone: 'error', label: 'Formula has an error' }
            : undefined
        }
        description={editor.errors.displayName && <span className="text-danger">{editor.errors.displayName}</span>}
        actions={
          <>
            {existingFunction && (
              <>
                <IconButton
                  label="Duplicate"
                  size="lg"
                  icon={<Copy className="h-4 w-4" aria-hidden="true" />}
                  onClick={duplicate}
                  disabled={dirty}
                  tooltip={dirty ? 'Save or discard your changes first' : undefined}
                />
                <IconButton
                  label="Delete function"
                  size="lg"
                  variant="danger"
                  icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setConfirmingDelete(true)}
                />
                <HeaderDivider />
              </>
            )}
            <IconButton label="Close" size="lg" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={() => leave(backHref)} />
            <SaveButton dirty={dirty} onClick={() => save()} />
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:flex-1 lg:min-h-0">
        <div className="flex flex-col px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
          <ParameterRail
            parameters={editor.parameters}
            materialCategories={materialCategories}
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
              openNewParameter(editor.parameters.length);
            }}
            focusLabelOf={focusLabelOf}
            onLabelFocused={() => setFocusLabelOf(null)}
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
              <IconButton
                label={editingDetails ? 'Done editing details' : 'Edit details'}
                size="sm"
                icon={editingDetails ? <Check className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setEditingDetails((editing) => !editing)}
                aria-expanded={editingDetails}
                className="-mr-1.5"
              />
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
              unknownNames={unknownValueNames(editor.formData.formula, formulaNames)}
              onCreateParameter={(name) => {
                editor.addParameterNamed(name);
                openNewParameter(editor.parameters.length);
              }}
              onFormulaChange={(next) => editor.handleFormDataChange({ formula: next })}
              formulaTextareaRef={editor.formulaTextareaRef}
              formulaValidation={editor.formulaValidation}
              propertyHint={editor.propertyHint}
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
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmingRename !== null}
        title="Rename a function that's in use?"
        message={`This function is called as ${existingFunction?.name ?? ''}(…) by ${usedBy}. After renaming it to ${newName}, those formulas stop calculating until you update them to the new name.`}
        confirmLabel="Rename anyway"
        destructive
        onConfirm={() => {
          const then = confirmingRename?.then;
          setConfirmingRename(null);
          commitSave(then);
        }}
        onCancel={() => setConfirmingRename(null)}
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

      <SaveChangesDialog
        isOpen={leavingTo !== null}
        name={editor.formData.displayName.trim() || newName || 'this function'}
        onSave={() => {
          const href = leavingTo ?? undefined;
          setLeavingTo(null);
          save(href);
        }}
        onDiscard={() => {
          const href = leavingTo;
          setLeavingTo(null);
          if (href) router.push(href);
        }}
        onCancel={() => setLeavingTo(null)}
      />
    </div>
  );
}
