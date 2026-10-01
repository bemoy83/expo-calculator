'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DashedAdd } from '@/components/ui/DashedAdd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Input } from '@/components/ui/Input';
import { RailRow } from '@/components/ui/RailRow';
import { Segmented } from '@/components/ui/Segmented';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Breadcrumb, browseHref, withSelected } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLeaveEditor } from '@/components/shared/NavigationGuard';
import { HeaderDivider, OverflowMenu } from '@/components/shared/OverflowMenu';
import { SaveChangesDialog } from '@/components/shared/SaveChangesDialog';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import {
  addInput,
  addPart,
  addSection,
  addStep,
  bindCallParameters,
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
  showsStaffResults,
  suggestKey,
  updateInput,
  updatePart,
  updateStep,
  unplacedInputs,
} from '@/lib/calculator/editing';
import { useSettledErrors } from '@/hooks/use-settled-errors';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import { displayUnit, isStepError, stepDisplayLabel } from '@/lib/calculator/format';
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
import { cn } from '@/lib/utils';
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
import { FormulaLegend } from '@/components/formula/FormulaText';

const EMPTY_VALUES: CalculatorValues = {};

/** What an input is, in the inputs list: its unit, or its kind. */
function inputDetail(input: CalculatorInput): string {
  const spec = input.value;
  if ('unitSymbol' in spec && spec.unitSymbol) return displayUnit(spec.unitSymbol) ?? spec.unitSymbol;
  if (spec.kind === 'material' || spec.kind === 'labor') return spec.category || spec.kind;
  if (spec.kind === 'boolean') return 'yes/no';
  return spec.kind;
}

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
  const [calculator, setCalculator] = useState(() => ensureLayoutIds(initial, generateId));
  // Name/category/description are edited here, separately from `calculator`, so typing in them
  // doesn't change `calculator`'s identity — which would otherwise re-run evaluation and
  // re-render the whole parts/layout tree on every keystroke for fields that don't affect either.
  // They're merged into `calculator` only when actually saved (see `save` below).
  const [nameDraft, setNameDraft] = useState(initial.name);
  const [categoryDraft, setCategoryDraft] = useState(initial.category ?? '');
  const [descriptionDraft, setDescriptionDraft] = useState(initial.description ?? '');
  const [view, setView] = useState<'parts' | 'layout'>('parts');
  const [preview, setPreview] = useState(false);
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
    /** A function-call step parameter to link the new input to. */
    bindTo?: { stepId: string; paramName: string };
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
  const errorCount = Object.values(result.steps).filter(isStepError).length;
  const incompleteCount = Object.values(result.steps).filter((step) => step.status === 'error' && step.incomplete).length;
  const showsNothing = calculator.steps.length > 0 && !showsStaffResults(calculator);
  const unnamedShown = calculator.steps.filter((step) => !step.label.trim() && isStepShown(calculator, step.id));
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

  // Picking a function links its parameters to inputs of the same name, making the missing ones.
  const changeStep = (step: CalculatorStep) => {
    const previous = calculator.steps.find((candidate) => candidate.id === step.id);
    const picked =
      step.source.type === 'call' &&
      !!step.source.functionName &&
      (previous?.source.type !== 'call' || previous.source.functionName !== step.source.functionName);
    if (!picked) {
      edit((current) => updateStep(current, step));
      return;
    }
    const { calculator: next, created } = bindCallParameters(updateStep(calculator, step), step.id, library.functions, generateId);
    edit(() => next);
    if (created.length > 0) {
      notify({ message: `Added ${created.length === 1 ? 'an input' : `${created.length} inputs`}: ${created.map((input) => input.label).join(', ')}.` });
    }
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
    const bindTo = inputDialog?.bindTo;
    if (bindTo) {
      edit((current) => {
        const step = current.steps.find((candidate) => candidate.id === bindTo.stepId);
        if (!step || step.source.type !== 'call') return current;
        return updateStep(current, {
          ...step,
          source: { ...step.source, args: { ...step.source.args, [bindTo.paramName]: { type: 'input', key: input.key } } },
        });
      });
    }
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
  const partStatus = (partId: string) =>
    calculator.steps.some((step) => step.partId === partId && isStepError(result.steps[step.id]))
      ? ('error' as const)
      : calculator.steps.some((step) => step.partId === partId && result.steps[step.id]?.incomplete)
        ? ('draft' as const)
        : undefined;

  // Where palette items go: the selected section, the selected item's section, else the first.
  const targetSectionId = selectedSection?.id ?? selectedPosition?.sectionId ?? calculator.layout[0]?.id;
  const placeInTarget = (item: LayoutItem) =>
    targetSectionId ? layoutActions.onInsertItem(targetSectionId, item) : addLayoutSection();
  const unplaced = unplacedInputs(calculator);
  const unshownSteps = calculator.steps.filter((step) => !isStepShown(calculator, step.id));

  const category = categoryDraft.trim();
  const header = (
    <PageHeader
      eyebrow={
        <Breadcrumb
          items={[
            { label: 'Calculators', href: browseHref('/', { id: isSaved ? calculator.id : undefined }) },
            ...(category
              ? [{ label: category, href: browseHref('/', { category, id: isSaved ? calculator.id : undefined }) }]
              : []),
            ...(isSaved
              ? [{ label: nameDraft.trim() || 'Calculator', href: `/calculator?id=${encodeURIComponent(calculator.id)}` }]
              : []),
          ]}
          meta={`Editing${dirty ? ' · Unsaved' : ''}`}
        />
      }
      editing
      title={
        <input
          id="calculator-name"
          value={nameDraft}
          placeholder="New calculator"
          aria-label="Calculator name"
          aria-invalid={nameError ? 'true' : undefined}
          size={Math.max(nameDraft.length, 14)}
          onChange={(event) => {
            setNameError(undefined);
            setNameDraft(event.target.value);
            setDirty(true);
          }}
          className="w-full min-w-0 bg-transparent placeholder:text-ink-faint focus:outline-none"
        />
      }
      status={
        calculator.steps.length > 0
          ? {
              tone: errorCount > 0 ? 'error' : incompleteCount > 0 ? 'draft' : 'ok',
              label:
                errorCount > 0
                  ? errorCount === 1
                    ? '1 step has an error'
                    : `${errorCount} steps have errors`
                  : incompleteCount > 0
                    ? incompleteCount === 1
                      ? '1 step incomplete'
                      : `${incompleteCount} steps incomplete`
                    : 'No errors',
            }
          : undefined
      }
      description={nameError && <span className="text-danger">{nameError}</span>}
      actions={
        <>
          {view === 'layout' && (
            <Button variant="ghost" onClick={() => setPreview((current) => !current)} aria-pressed={preview}>
              {preview ? 'Back to editing' : 'Preview'}
            </Button>
          )}
          <Segmented
            aria-label="Builder view"
            options={[
              { value: 'parts', label: 'Parts' },
              { value: 'layout', label: 'Layout' },
            ]}
            value={view}
            onChange={setView}
          />
          <HeaderDivider />
          {isSaved && (
            <OverflowMenu items={[{ label: 'Delete calculator', danger: true, onSelect: () => setPending({ kind: 'delete-calculator' }) }]} />
          )}
          <Button variant="secondary" onClick={() => leave(closeHref)}>
            Close
          </Button>
          <Button variant="accent" onClick={() => save()}>
            Save
          </Button>
        </>
      }
    />
  );

  const warnings = (
    <>
      {showsNothing && (
        <div role="status" className="mb-4 flex items-start gap-2.5 p-3 bg-draft-bg border border-draft-border rounded-row">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-draft" aria-hidden="true" />
          <p className="text-sm text-ink-body">
            <span className="font-medium text-ink">Staff won&apos;t see any results.</span> Tick &ldquo;Show to staff&rdquo; on a
            step, or make a step a part&apos;s cost, so the calculator shows what it works out.
          </p>
        </div>
      )}
      {!showsNothing && unnamedShown.length > 0 && (
        <div role="status" className="mb-4 flex items-start gap-2.5 p-3 bg-draft-bg border border-draft-border rounded-row">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-draft" aria-hidden="true" />
          <p className="text-sm text-ink-body">
            <span className="font-medium text-ink">
              {unnamedShown.length === 1 ? 'A step shown to staff has no label.' : `${unnamedShown.length} steps shown to staff have no label.`}
            </span>{' '}
            Staff see {unnamedShown.map((step) => `“${stepDisplayLabel(step)}”`).join(', ')} instead; give{' '}
            {unnamedShown.length === 1 ? 'it a label' : 'them labels'} that say what they are.
          </p>
        </div>
      )}
    </>
  );

  const partsView = (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:flex-1 lg:min-h-0">
      <nav aria-label="Parts and inputs" className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
        <div className="flex justify-between px-2.5 pb-2">
          <Eyebrow>Parts</Eyebrow>
          <span className="font-numeric text-xs text-ink-faint">{calculator.parts.length}</span>
        </div>
        {calculator.parts.map((candidate, index) => {
          const cost = result.parts[candidate.id]?.cost;
          return (
            <RailRow
              key={candidate.id}
              index={index + 1}
              title={candidate.name || 'Unnamed part'}
              stacked
              value={cost !== undefined ? formatMoney(cost) : partStatus(candidate.id) ? undefined : '—'}
              status={partStatus(candidate.id)}
              selected={candidate.id === part?.id}
              onClick={() => setChosenPartId(candidate.id)}
            />
          );
        })}
        <DashedAdd onClick={addNewPart} className="mt-1 p-2.5">
          + Add part
        </DashedAdd>

        <div className="flex justify-between items-baseline px-2.5 pt-[22px] pb-2">
          <Eyebrow>Inputs</Eyebrow>
          <button
            type="button"
            onClick={() => setInputDialog({})}
            className="font-numeric text-xs tracking-[.06em] text-ink hover:text-ink-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            + New
          </button>
        </div>
        {calculator.inputs.length === 0 && (
          <p className="px-2.5 text-xs text-ink-muted">No inputs yet. A formula naming one that doesn&apos;t exist offers to create it.</p>
        )}
        {calculator.inputs.map((input) => {
          const used = usedInputs.has(input.key);
          return (
            <button
              key={input.id}
              type="button"
              onClick={() => setInputDialog({ input })}
              title={`${input.label}${used ? '' : ' · not used by any step yet'}`}
              aria-label={`Edit input ${input.label}${used ? '' : ', not used yet'}`}
              className={cn(
                'flex justify-between gap-2 px-2.5 py-[7px] rounded-md text-[13px] text-left transition-colors hover:bg-surface-hover',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                !used && 'bg-sunken'
              )}
            >
              <span className={cn('font-numeric truncate', used ? 'text-token-input' : 'text-ink-muted')}>{input.key}</span>
              <span className={cn('shrink-0 text-xs', used ? 'font-numeric text-ink-faint' : 'text-ink-faint')}>
                {used ? inputDetail(input) : 'not used'}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex flex-col px-4 sm:px-7 py-5 lg:overflow-y-auto">
        {warnings}
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
            onStepChange={changeStep}
            onSetCost={(stepId) => edit((current) => setPartCost(current, part.id, stepId))}
            onSetShown={(stepId, shown) => edit((current) => setStepShown(current, stepId, shown, generateId))}
            onMoveStep={(stepId, direction) => edit((current) => reorderStep(current, stepId, direction))}
            onMoveStepToPart={(stepId, partId) => edit((current) => moveStepToPart(current, stepId, partId))}
            onRemoveStep={(step) => {
              edit((current) => removeStep(current, step.id));
              if (expandedStepId === step.id) setExpandedStepId(null);
            }}
            onCreateInput={(key) => setInputDialog({ suggestedKey: key })}
            onCreateInputFor={(stepId, paramName, kind) => {
              const step = calculator.steps.find((candidate) => candidate.id === stepId);
              const fn =
                step?.source.type === 'call'
                  ? library.functions.find((candidate) => candidate.name === (step.source as { functionName: string }).functionName)
                  : undefined;
              const param = fn?.parameters.find((candidate) => candidate.name === paramName);
              const label = param?.label || paramName;
              setInputDialog({
                suggestedKey: suggestKey(calculator, label, undefined, 'value'),
                suggestedKind: kind,
                suggestedLabel: label,
                suggestedUnitSymbol: param?.unitSymbol,
                bindTo: { stepId, paramName },
              });
            }}
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

  const paletteRow =
    'w-full flex justify-between gap-2 px-2.5 py-[9px] rounded-md border border-dashed border-border-strong text-[13px] text-left text-ink transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action';
  const addRow =
    'w-full px-2.5 py-[9px] rounded-md text-[13px] text-left text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action';

  const layoutView = (
    <div
      className={cn(
        'grid grid-cols-1 lg:flex-1 lg:min-h-0',
        !preview && 'lg:grid-cols-[240px_minmax(0,1fr)_320px]'
      )}
    >
      {!preview && (
        <nav aria-label="Add to the form" className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
          <Eyebrow className="px-2.5 pb-2">Not placed</Eyebrow>
          {unplaced.length === 0 && unshownSteps.length === 0 && (
            <p className="px-2.5 text-xs text-ink-muted">Every input and result is on the form.</p>
          )}
          {unplaced.map((input) => (
            <button
              key={input.id}
              type="button"
              className={paletteRow}
              onClick={() => placeInTarget({ type: 'input', inputId: input.id })}
              aria-label={`Place input ${input.label} on the form`}
            >
              <span className="truncate">{input.label}</span>
              <span className="font-numeric text-token-input truncate">{input.key}</span>
            </button>
          ))}
          {unshownSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={paletteRow}
              onClick={() => placeInTarget({ type: 'result', stepId: step.id, style: 'row' })}
              aria-label={`Place result ${step.label || step.key} on the form`}
            >
              <span className="truncate">{step.label || step.key}</span>
              <span className="font-numeric text-token-result truncate">{step.key}</span>
            </button>
          ))}

          <Eyebrow className="px-2.5 pt-[22px] pb-2">Add</Eyebrow>
          <button type="button" className={addRow} onClick={() => addLayoutSection(targetSectionId)}>
            + Section
          </button>
          <button type="button" className={addRow} onClick={() => placeInTarget({ type: 'text', text: '' })}>
            + Text
          </button>
          <button type="button" className={addRow} onClick={() => placeInTarget({ type: 'divider' })}>
            + Divider
          </button>
          <button
            type="button"
            className={addRow}
            onClick={() => placeInTarget({ type: 'breakdown', partIds: calculator.parts.map((candidate) => candidate.id) })}
          >
            + Breakdown
          </button>
          <button
            type="button"
            className={addRow}
            onClick={() => (targetSectionId ? layoutActions.onNewInput(targetSectionId) : addLayoutSection())}
          >
            + New input
          </button>
          <p className="mt-auto pt-4 px-2.5 text-xs leading-[1.5] text-ink-faint">
            Select a section, then click to add to it. Drag items on the form by their handle to move them.
          </p>
        </nav>
      )}

      <div className="min-w-0 bg-sunken px-4 sm:px-8 py-6 lg:overflow-y-auto">
        <div className={cn('mx-auto', preview ? 'max-w-[760px]' : 'max-w-[800px]')}>
          {warnings}
          <LayoutCanvas
            context={layoutContext}
            selection={selection}
            preview={preview}
            onSelect={setSelection}
            onMove={layoutActions.onMoveItem}
            onAddSection={() => addLayoutSection()}
          />
        </div>
      </div>

      {!preview && (
        <div className="px-6 py-5 bg-panel border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto">
          <LayoutInspector
            calculator={calculator}
            selectedSection={selectedSection}
            selectedItem={selectedItem}
            library={library}
            actions={layoutActions}
          />
        </div>
      )}
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
