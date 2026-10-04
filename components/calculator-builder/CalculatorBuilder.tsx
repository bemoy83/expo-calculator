'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { withSelected } from '@/components/shared/Breadcrumb';
import { useLeaveEditor } from '@/components/shared/NavigationGuard';
import { SaveChangesDialog } from '@/components/shared/SaveChangesDialog';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import {
  addInput,
  addPart,
  addSection,
  addStep,
  ensureLayoutIds,
  findLayoutItem,
  insertLayoutItem,
  isStepShown,
  moveLayoutItem,
  moveSection,
  removeLayoutItem,
  removeSection,
  updateLayoutItem,
  updateSection,
  moveStepToPart,
  movePart,
  removeInput,
  removePart,
  removeStep,
  reorderStep,
  setInputCondition,
  setPartCost,
  setStepShown,
  suggestKey,
  updateInput,
  updatePart,
  updateStep,
} from '@/lib/calculator/editing';
import { callStepsToFormulas } from '@/lib/calculator/step-source';
import { useSettledErrors } from '@/hooks/use-settled-errors';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import { stepErrorLevel } from '@/lib/calculator/step-issues';
import { requiredProperties } from '@/lib/calculator/requirements';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorStep,
  CalculatorValues,
  InputKind,
  LayoutItem,
} from '@/lib/calculator/types';
import type { LayoutRenderContext } from '@/components/calculator/CalculatorLayoutItem';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { notify } from '@/lib/stores/notifications-store';
import { generateId } from '@/lib/utils';
import { builderCloseHref, builderHref, type FromList } from './builder-href';
import { InputEditorDialog } from './InputEditorDialog';
import { LayoutCanvas, type LayoutSelection } from './LayoutCanvas';
import { LayoutInspector, type LayoutInspectorActions } from './LayoutInspector';
import { PartLivePane, PartSteps } from './PartCard';
import { BuilderHeader } from './BuilderHeader';
import { BuilderWarnings } from './BuilderWarnings';
import { LayoutPalette } from './LayoutPalette';
import { useSurface } from './layout-surface';
import { PartsRail } from './PartsRail';
import { builderStatus } from '@/lib/calculator/builder-status';
import { FormulaLegend } from '@/components/formula/FormulaText';

const EMPTY_VALUES: CalculatorValues = {};

type Pending =
  | { kind: 'delete-calculator' }
  | { kind: 'delete-part'; partId: string }
  | { kind: 'delete-input'; input: CalculatorInput };

interface CalculatorBuilderProps {
  initial: Calculator;
  /** Already saved: offers Delete, and Close returns to it. */
  isSaved: boolean;
  library: CalculatorLibrary;
  /** Opened from the calculators list (`?from=list`): Close goes back there. */
  fromList?: FromList;
}

// The builder's parts view: each part as its own card to build and test, inputs defined
// once for the whole calculator, and test values shared with the staff view.
export function CalculatorBuilder({ initial, isSaved: initiallySaved, library, fromList }: CalculatorBuilderProps) {
  const router = useRouter();
  // Layout items get ids up front so a selection survives moving them.
  const [calculator, setCalculator] = useState(() => ensureLayoutIds(callStepsToFormulas(initial, library.functions), generateId));
  // Name/category/description are edited here, separately from `calculator`, so typing in them
  // doesn't change `calculator`'s identity — which would otherwise re-run evaluation and
  // re-render the whole parts/layout tree on every keystroke for fields that don't affect either.
  // They're merged into `calculator` only when actually saved (see `save` below).
  const [nameDraft, setNameDraft] = useState(initial.name);
  const [categoryDraft, setCategoryDraft] = useState(initial.category ?? '');
  const [descriptionDraft, setDescriptionDraft] = useState(initial.description ?? '');
  const [view, setView] = useState<'parts' | 'layout'>('parts');
  const [surface, setSurface] = useSurface();
  const [selection, setSelection] = useState<LayoutSelection>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [nameError, setNameError] = useState<string>();
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  // The part open in the centre; the first part when none is chosen (or it was deleted).
  const [chosenPartId, setChosenPartId] = useState<string | null>(null);
  const [inputDialog, setInputDialog] = useState<{
    input?: CalculatorInput;
    suggestedKey?: string;
    suggestedKind?: InputKind;
    suggestedLabel?: string;
    suggestedUnitSymbol?: string;
    sectionId?: string;
  } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const saveCalculator = useCalculatorsStore((state) => state.saveCalculator);
  const deleteCalculator = useCalculatorsStore((state) => state.deleteCalculator);
  const values = useCalculatorSessionStore((state) => state.values[calculator.id]) ?? EMPTY_VALUES;
  const setValue = useCalculatorSessionStore((state) => state.setValue);
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);

  const evaluated = useMemo(() => evaluateCalculator(calculator, values, library), [calculator, values, library]);
  // A half-typed formula shows as incomplete until its error has stood for a moment.
  const result = useSettledErrors(evaluated);
  const required = useMemo(() => requiredProperties(calculator, library.functions), [calculator, library.functions]);
  // A step's error is broken (red), or only a name that isn't an input yet (unresolved, amber).
  const brokenCount = Object.values(result.steps).filter((step) => stepErrorLevel(step) === 'broken').length;
  const unresolvedCount = Object.values(result.steps).filter((step) => stepErrorLevel(step) === 'unresolved').length;
  const incompleteCount = Object.values(result.steps).filter((step) => step.status === 'error' && step.incomplete).length;
  const usedInputs = new Set(Object.values(result.parts).flatMap((part) => part.inputKeys));

  const edit = (change: (current: Calculator) => Calculator) => {
    setCalculator((current) => change(current));
    setDirty(true);
  };
  const onValueChange = (key: string, value: CalculatorValues[string]) => setValue(calculator.id, key, value);

  const addStepTo = (partId: string) => {
    const step: CalculatorStep = {
      id: generateId(),
      partId,
      key: suggestKey(calculator, '', undefined, 'step'),
      label: '',
      source: { type: 'expression', expression: '' },
      format: 'number',
    };
    edit((current) => addStep(current, step));
    setExpandedStepId(step.id);
  };

  const addNewPart = () => {
    const part = { id: generateId(), name: `Part ${calculator.parts.length + 1}` };
    edit((current) => addPart(current, part));
    setChosenPartId(part.id);
  };

  const saveInput = (input: CalculatorInput) => {
    // A test value typed under the old name moves to the new one.
    const previous = calculator.inputs.find((existing) => existing.id === input.id);
    if (previous && previous.key !== input.key && values[previous.key] !== undefined) {
      setValue(calculator.id, input.key, values[previous.key]);
      setValue(calculator.id, previous.key, undefined);
    }
    const sectionId = inputDialog?.sectionId;
    edit((current) =>
      current.inputs.some((existing) => existing.id === input.id)
        ? updateInput(current, input)
        : addInput(current, input, generateId, sectionId)
    );
    if (sectionId) setSelection({ type: 'item', key: `input:${input.id}` });
    setInputDialog(null);
  };

  // ---- Layout view ----
  const inputsById = useMemo(() => new Map(calculator.inputs.map((input) => [input.id, input])), [calculator.inputs]);
  const inputsByKey = useMemo(() => new Map(calculator.inputs.map((input) => [input.key, input])), [calculator.inputs]);
  const layoutContext: LayoutRenderContext = {
    calculator,
    values,
    result,
    library,
    formatMoney,
    // As staff see it: inputs are marked "needed" only once something has been typed.
    needed: new Set(Object.values(values).some((value) => value !== undefined) ? result.missingInputs : []),
    inputsById,
    inputsByKey,
    onValueChange: (key, value) => setValue(calculator.id, key, value),
    required,
  };
  const selectedSection =
    selection?.type === 'section' ? calculator.layout.find((section) => section.id === selection.sectionId) : undefined;
  const selectedPosition = selection?.type === 'item' ? findLayoutItem(calculator, selection.key) : undefined;
  const selectedItem = selectedPosition
    ? {
        position: selectedPosition,
        item: calculator.layout.find((section) => section.id === selectedPosition.sectionId)!.items[selectedPosition.index],
      }
    : undefined;

  const addLayoutSection = (afterSectionId?: string) => {
    const id = generateId();
    edit((current) => addSection(current, { id, items: [] }, afterSectionId));
    setSelection({ type: 'section', sectionId: id });
  };

  const layoutActions: LayoutInspectorActions = {
    onUpdateSection: (sectionId, patch) => edit((current) => updateSection(current, sectionId, patch)),
    onSetInputCondition: (input, condition) => edit((current) => setInputCondition(current, input.id, condition)),
    onMoveSection: (sectionId, direction) => edit((current) => moveSection(current, sectionId, direction)),
    onRemoveSection: (sectionId) => {
      edit((current) => removeSection(current, sectionId));
      setSelection(null);
    },
    onAddSection: () => addLayoutSection(),
    onInsertItem: (sectionId, item) => {
      const placed: LayoutItem = item.type === 'input' || item.type === 'result' ? item : { ...item, id: generateId() };
      edit((current) => insertLayoutItem(current, sectionId, placed));
      const section = calculator.layout.find((candidate) => candidate.id === sectionId);
      const key =
        placed.type === 'input'
          ? `input:${placed.inputId}`
          : placed.type === 'result'
            ? `result:${placed.stepId}`
            : `${placed.type}:${placed.id}`;
      if (section) setSelection({ type: 'item', key });
    },
    onUpdateItem: (position, item) => {
      edit((current) => updateLayoutItem(current, position, item));
      // Showing another step changes the item's key.
      if (item.type === 'result') setSelection({ type: 'item', key: `result:${item.stepId}` });
    },
    onMoveItem: (from, to) => edit((current) => moveLayoutItem(current, from, to)),
    onRemoveItem: (position) => {
      edit((current) => removeLayoutItem(current, position));
      setSelection(null);
    },
    onSetWidget: (input, widget) => edit((current) => updateInput(current, { ...input, widget })),
    onEditInput: (input) => setInputDialog({ input }),
    onNewInput: (sectionId) => setInputDialog({ sectionId }),
    onDeselect: () => setSelection(null),
    onSetColor: (color) => edit((current) => ({ ...current, color })),
  };

  // Saves and stays; a new calculator's address becomes its own. Returns whether it saved.
  // Reads name/category/description straight from their drafts, not from `calculator` — so this
  // is correct even if a field's onBlur hasn't fired yet (e.g. saving via ⌘S while still typing).
  const save = ({ stay = true } = {}) => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setNameError('Give the calculator a name.');
      document.getElementById('calculator-name')?.focus();
      return false;
    }
    const saved = saveCalculator({
      ...calculator,
      name: trimmedName,
      category: categoryDraft.trim() || undefined,
      description: descriptionDraft.trim() || undefined,
    });
    setCalculator(saved);
    setNameDraft(saved.name);
    setCategoryDraft(saved.category ?? '');
    setDescriptionDraft(saved.description ?? '');
    setDirty(false);
    if (!isSaved) {
      setIsSaved(true);
      if (stay) router.replace(builderHref(saved.id, fromList));
    }
    notify({ variant: 'success', message: `Saved “${saved.name}”.` });
    return true;
  };
  useSaveShortcut(save);

  // Close goes back where the builder was opened from: the list (with this calculator
  // selected), else the calculator, or the list for a new one.
  const closeHref = builderCloseHref(calculator.id, isSaved, fromList);
  const { leavingTo, setLeavingTo, leave } = useLeaveEditor(dirty);

  const confirmPending = () => {
    if (!pending) return;
    switch (pending.kind) {
      case 'delete-calculator':
        deleteCalculator(calculator.id);
        notify({ variant: 'success', message: `Deleted “${nameDraft}”.` });
        router.push('/');
        break;
      case 'delete-part':
        edit((current) => removePart(current, pending.partId));
        break;
      case 'delete-input':
        edit((current) => removeInput(current, pending.input.id));
        setInputDialog(null);
        break;
    }
    setPending(null);
  };

  const pendingPart = pending?.kind === 'delete-part' ? calculator.parts.find((part) => part.id === pending.partId) : undefined;
  const pendingText: Record<Pending['kind'], { title: string; message?: string; label: string }> = {
    'delete-calculator': {
      title: `Delete “${nameDraft}”?`,
      message: 'The calculator is deleted for good. Quote lines sent from it keep their price but can no longer be edited.',
      label: 'Delete',
    },
    'delete-part': {
      title: `Delete “${pendingPart?.name || 'part'}”?`,
      message: 'Its steps are deleted with it. Steps in other parts that use them will say so.',
      label: 'Delete part',
    },
    'delete-input': {
      title: pending?.kind === 'delete-input' ? `Delete “${pending.input.label}”?` : 'Delete input?',
      message: 'Formulas that use it will show an error until they are changed.',
      label: 'Delete input',
    },
  };

  const part = calculator.parts.find((candidate) => candidate.id === chosenPartId) ?? calculator.parts[0];
  const partIndex = part ? calculator.parts.indexOf(part) : -1;
  // Where palette items go: the selected section, the selected item's section, else the first.
  const targetSectionId = selectedSection?.id ?? selectedPosition?.sectionId ?? calculator.layout[0]?.id;
  const placeInTarget = (item: LayoutItem) =>
    targetSectionId ? layoutActions.onInsertItem(targetSectionId, item) : addLayoutSection();

  const header = (
    <BuilderHeader
      calculatorId={calculator.id}
      isSaved={isSaved}
      dirty={dirty}
      nameDraft={nameDraft}
      nameError={nameError}
      category={categoryDraft.trim()}
      view={view}
      status={builderStatus(calculator.steps.length, { broken: brokenCount, unresolved: unresolvedCount, incomplete: incompleteCount })}
      onNameChange={(name) => {
        setNameError(undefined);
        setNameDraft(name);
        setDirty(true);
      }}
      onViewChange={setView}
      onDelete={() => setPending({ kind: 'delete-calculator' })}
      onClose={() => leave(closeHref)}
      onSave={() => save()}
    />
  );

  const partsView = (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:flex-1 lg:min-h-0">
      <PartsRail
        calculator={calculator}
        result={result}
        formatMoney={formatMoney}
        selectedPartId={part?.id}
        usedInputs={usedInputs}
        onSelectPart={setChosenPartId}
        onAddPart={addNewPart}
        onNewInput={() => setInputDialog({})}
        onEditInput={(input) => setInputDialog({ input })}
      />

      <div className="min-w-0 flex flex-col px-4 sm:px-7 py-5 lg:overflow-y-auto">
        <BuilderWarnings calculator={calculator} />
        {part ? (
          <PartSteps
            key={part.id}
            calculator={calculator}
            part={part}
            result={result}
            values={values}
            library={library}
            formatMoney={formatMoney}
            required={required}
            isFirst={partIndex === 0}
            isLast={partIndex === calculator.parts.length - 1}
            expandedStepId={expandedStepId}
            isStepShown={(stepId) => isStepShown(calculator, stepId)}
            onToggleStep={(stepId) => setExpandedStepId((current) => (current === stepId ? null : stepId))}
            onRename={(name) => edit((current) => updatePart(current, { ...part, name }))}
            onMove={(direction) => edit((current) => movePart(current, part.id, direction))}
            onRemove={() =>
              calculator.steps.some((step) => step.partId === part.id)
                ? setPending({ kind: 'delete-part', partId: part.id })
                : edit((current) => removePart(current, part.id))
            }
            onAddStep={() => addStepTo(part.id)}
            onStepChange={(step) => edit((current) => updateStep(current, step))}
            onSetCost={(stepId) => edit((current) => setPartCost(current, part.id, stepId))}
            onSetShown={(stepId, shown) => edit((current) => setStepShown(current, stepId, shown, generateId))}
            onMoveStep={(stepId, direction) => edit((current) => reorderStep(current, stepId, direction))}
            onMoveStepToPart={(stepId, partId) => edit((current) => moveStepToPart(current, stepId, partId))}
            onRemoveStep={(step) => {
              edit((current) => removeStep(current, step.id));
              if (expandedStepId === step.id) setExpandedStepId(null);
            }}
            onCreateInput={(key, param) =>
              setInputDialog({
                suggestedKey: key,
                ...(param && { suggestedKind: param.kind, suggestedLabel: param.label, suggestedUnitSymbol: param.unitSymbol }),
              })
            }
          />
        ) : (
          <div className="rounded-row border border-dashed border-border-strong px-4 py-10 text-center">
            <p className="text-sm text-ink-muted">Add a part to start. Build and test one part at a time.</p>
            <Button variant="accent" className="mt-3" onClick={addNewPart}>
              + Add part
            </Button>
          </div>
        )}
        <FormulaLegend className="mt-5" />

        <details className="mt-6 group">
          <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Calculator details</summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-3">
            <Input
              label="Category"
              value={categoryDraft}
              placeholder="e.g. Walls"
              onChange={(event) => {
                setCategoryDraft(event.target.value);
                setDirty(true);
              }}
            />
            <Textarea
              label="Description (optional)"
              rows={2}
              value={descriptionDraft}
              onChange={(event) => {
                setDescriptionDraft(event.target.value);
                setDirty(true);
              }}
            />
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
        {part && (
          <PartLivePane
            calculator={calculator}
            part={part}
            result={result}
            values={values}
            library={library}
            formatMoney={formatMoney}
            required={required}
            expandedStepId={expandedStepId}
            isStepShown={(stepId) => isStepShown(calculator, stepId)}
            onValueChange={onValueChange}
            onEditInput={(input) => setInputDialog({ input })}
          />
        )}
        <div className="mt-auto flex flex-col gap-4">
          <div className="border-t border-border-strong pt-3.5">
            <div className="text-[13px] text-ink-muted">Calculator total</div>
            <div className="font-numeric text-[38px] font-semibold tracking-[-.04em] leading-[1.1] text-accent break-all">
              {result.total !== undefined ? formatMoney(result.total) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const layoutView = (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:flex-1 lg:min-h-0">
      <LayoutPalette
        calculator={calculator}
        onPlace={placeInTarget}
        onAddSection={() => addLayoutSection(targetSectionId)}
        onNewInput={() => (targetSectionId ? layoutActions.onNewInput(targetSectionId) : addLayoutSection())}
      />

      <div className="min-w-0 bg-sunken px-4 sm:px-8 py-6 lg:overflow-y-auto">
        <div className="mx-auto max-w-[1040px]">
          <BuilderWarnings calculator={calculator} />
          <LayoutCanvas
            context={layoutContext}
            name={nameDraft.trim()}
            surface={surface}
            selection={selection}
            onSelect={setSelection}
            onMove={layoutActions.onMoveItem}
            onAddSection={() => addLayoutSection()}
          />
        </div>
      </div>

      <div className="flex flex-col bg-panel border-t lg:border-t-0 lg:border-l border-border lg:min-h-0 lg:overflow-hidden">
        <LayoutInspector
          calculator={calculator}
          selectedSection={selectedSection}
          selectedItem={selectedItem}
          library={library}
          name={nameDraft.trim()}
          surface={surface}
          onSurfaceChange={setSurface}
          actions={layoutActions}
        />
      </div>
    </div>
  );

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      {header}
      {view === 'layout' ? layoutView : partsView}

      <InputEditorDialog
        isOpen={inputDialog !== null}
        calculator={calculator}
        input={inputDialog?.input}
        suggestedKey={inputDialog?.suggestedKey}
        suggestedKind={inputDialog?.suggestedKind}
        suggestedLabel={inputDialog?.suggestedLabel}
        suggestedUnitSymbol={inputDialog?.suggestedUnitSymbol}
        library={library}
        onSave={saveInput}
        onDelete={(input) => setPending({ kind: 'delete-input', input })}
        onClose={() => setInputDialog(null)}
      />

      <ConfirmDialog
        isOpen={pending !== null}
        title={pending ? pendingText[pending.kind].title : ''}
        message={pending ? pendingText[pending.kind].message : undefined}
        confirmLabel={pending ? pendingText[pending.kind].label : 'Confirm'}
        destructive
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />

      <SaveChangesDialog
        isOpen={leavingTo !== null}
        name={nameDraft.trim() || 'this calculator'}
        onSave={() => {
          const href = leavingTo;
          setLeavingTo(null);
          // Back in the list, a calculator saved for the first time is the one selected.
          if (save({ stay: false }) && href) router.push(withSelected(href, '/', calculator.id));
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
